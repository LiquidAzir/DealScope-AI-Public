import logging
from typing import Dict, Any
from schemas.core import CoreEntities, MarketEntities, SignalEntities
from schemas.outputs import GraphInsights
from config import NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD, NEO4J_ENABLED

logger = logging.getLogger(__name__)


class GraphAgent:
    """Builds the Neo4j relationship graph and runs analytical queries."""

    def __init__(self):
        self.driver = None
        if NEO4J_ENABLED:
            try:
                import neo4j
                self.driver = neo4j.AsyncGraphDatabase.driver(
                    NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD)
                )
                logger.info("Neo4j driver initialised")
            except Exception as e:
                logger.warning(f"Neo4j initialisation failed: {e}")
                self.driver = None

    async def close(self):
        if self.driver:
            await self.driver.close()

    async def build_graph(
        self,
        core: CoreEntities,
        market: MarketEntities,
        signals: SignalEntities,
    ) -> None:
        if not self.driver:
            logger.info("Neo4j not available — skipping graph construction")
            return

        # Verify credentials before attempting writes
        try:
            await self.driver.verify_connectivity()
        except Exception as e:
            logger.warning(f"Neo4j connectivity check failed: {e} — disabling Neo4j")
            self.driver = None
            return

        try:
            async with self.driver.session() as session:
                company_name = core.company.name

                # Target company
                await session.run(
                    """
                    MERGE (c:Company {name: $name})
                    SET c.sector = $sector,
                        c.sub_sector = $sub_sector,
                        c.founded_year = $founded_year,
                        c.hq = $hq,
                        c.description = $description,
                        c.total_funding = $total_funding,
                        c.estimated_revenue = $estimated_revenue,
                        c.is_target = true
                    """,
                    name=company_name,
                    sector=core.company.sector,
                    sub_sector=core.company.sub_sector,
                    founded_year=core.company.founded_year,
                    hq=core.company.hq_location,
                    description=core.company.description,
                    total_funding=core.funding.total_raised,
                    estimated_revenue=core.traction.estimated_revenue,
                )

                # Market node + OPERATES_IN
                if market.market.name:
                    await session.run(
                        """
                        MERGE (m:Market {name: $name})
                        SET m.tam = $tam, m.growth_rate = $growth_rate
                        WITH m
                        MATCH (c:Company {name: $company_name})
                        MERGE (c)-[:OPERATES_IN]->(m)
                        """,
                        name=market.market.name,
                        tam=market.market.tam,
                        growth_rate=market.market.growth_rate,
                        company_name=company_name,
                    )

                # Founders
                for founder in core.founders:
                    await session.run(
                        """
                        MERGE (p:Person {name: $name})
                        SET p.role = $role, p.background = $background
                        WITH p
                        MATCH (c:Company {name: $company_name})
                        MERGE (p)-[:FOUNDED]->(c)
                        MERGE (p)-[:LEADS {role: $role}]->(c)
                        """,
                        name=founder.name,
                        role=founder.role,
                        background=founder.background,
                        company_name=company_name,
                    )
                    for prior in founder.prior_companies:
                        if prior:
                            await session.run(
                                """
                                MERGE (prev:Company {name: $prior})
                                WITH prev
                                MATCH (p:Person {name: $founder_name})
                                MERGE (p)-[:PREVIOUSLY_AT]->(prev)
                                """,
                                prior=prior,
                                founder_name=founder.name,
                            )

                # Investors
                for investor in core.investors:
                    await session.run(
                        """
                        MERGE (inv:Investor {name: $name})
                        SET inv.type = $type
                        WITH inv
                        MATCH (c:Company {name: $company_name})
                        MERGE (inv)-[:INVESTED_IN {is_lead: $is_lead}]->(c)
                        """,
                        name=investor.name,
                        type=investor.type,
                        is_lead=investor.is_lead,
                        company_name=company_name,
                    )

                # Competitors + COMPETES_WITH
                for comp in core.competitors:
                    await session.run(
                        """
                        MERGE (comp:Company {name: $name})
                        SET comp.estimated_funding = $estimated_funding
                        WITH comp
                        MATCH (target:Company {name: $target_name})
                        MERGE (target)-[:COMPETES_WITH {overlap: $overlap}]->(comp)
                        """,
                        name=comp.name,
                        estimated_funding=comp.estimated_funding,
                        target_name=company_name,
                        overlap=comp.overlap_type,
                    )

                # Competitor investors (creates cross-portfolio overlap edges)
                for cd in market.competitor_details:
                    for inv_name in cd.key_investors:
                        if inv_name:
                            await session.run(
                                """
                                MERGE (inv:Investor {name: $inv_name})
                                WITH inv
                                MERGE (comp:Company {name: $comp_name})
                                MERGE (inv)-[:INVESTED_IN]->(comp)
                                """,
                                inv_name=inv_name,
                                comp_name=cd.name,
                            )

                # M&A transactions
                for acq in market.acquisitions:
                    if acq.target and acq.acquirer:
                        await session.run(
                            """
                            MERGE (tgt:Company {name: $target})
                            MERGE (acq:Company {name: $acquirer})
                            MERGE (acq)-[r:ACQUIRED]->(tgt)
                            SET r.year = CASE WHEN $year IS NOT NULL THEN $year ELSE r.year END,
                                r.deal_size = CASE WHEN $deal_size IS NOT NULL THEN $deal_size ELSE r.deal_size END,
                                r.implied_multiple = CASE WHEN $implied_multiple IS NOT NULL THEN $implied_multiple ELSE r.implied_multiple END
                            """,
                            target=acq.target,
                            acquirer=acq.acquirer,
                            year=acq.year,
                            deal_size=acq.deal_size,
                            implied_multiple=acq.implied_multiple,
                        )
                        # Link acquired target to market
                        if market.market.name:
                            await session.run(
                                """
                                MATCH (tgt:Company {name: $target})
                                MERGE (m:Market {name: $market_name})
                                MERGE (tgt)-[:OPERATES_IN]->(m)
                                """,
                                target=acq.target,
                                market_name=market.market.name,
                            )

                # Partnerships
                for p in signals.partnerships:
                    if p.partner:
                        await session.run(
                            """
                            MERGE (partner:Company {name: $partner})
                            WITH partner
                            MATCH (c:Company {name: $company_name})
                            MERGE (c)-[:PARTNERS_WITH {type: $type}]->(partner)
                            """,
                            partner=p.partner,
                            type=p.type,
                            company_name=company_name,
                        )

                logger.info(f"Graph built for '{company_name}'")
        except Exception as e:
            logger.warning(f"Neo4j graph build failed: {e} — continuing without graph")
            self.driver = None

    async def run_analysis_queries(self, company_name: str) -> GraphInsights:
        if not self.driver:
            return GraphInsights(neo4j_available=False)

        insights = GraphInsights(neo4j_available=True)

        try:
            async with self.driver.session() as session:
                # 1. Investor overlap with competitors
                result = await session.run(
                    """
                    MATCH (target:Company {name: $name})<-[:INVESTED_IN]-(inv:Investor)
                          -[:INVESTED_IN]->(comp:Company)
                    WHERE (target)-[:COMPETES_WITH]-(comp)
                    RETURN inv.name AS investor,
                           COLLECT(DISTINCT comp.name) AS also_backs
                    """,
                    name=company_name,
                )
                insights.investor_overlaps = [dict(r) async for r in result]

                # 2. Top acquirers in same market
                result = await session.run(
                    """
                    MATCH (target:Company {name: $name})-[:OPERATES_IN]->(m:Market)
                          <-[:OPERATES_IN]-(t:Company)<-[:ACQUIRED]-(a:Company)
                    RETURN a.name AS acquirer,
                           COUNT(DISTINCT t) AS deal_count,
                           COLLECT(DISTINCT t.name) AS targets_acquired
                    ORDER BY deal_count DESC
                    LIMIT 5
                    """,
                    name=company_name,
                )
                insights.top_acquirers = [dict(r) async for r in result]

                # 3. Competitive density
                result = await session.run(
                    """
                    MATCH (target:Company {name: $name})-[:COMPETES_WITH]-(comp:Company)
                    RETURN COUNT(DISTINCT comp) AS competitor_count
                    """,
                    name=company_name,
                )
                record = await result.single()
                insights.competitive_density = dict(record) if record else {}

                # 4. Graph stats
                result = await session.run(
                    "MATCH (n) RETURN labels(n)[0] AS label, COUNT(n) AS count"
                )
                insights.graph_stats = {r["label"]: r["count"] async for r in result}
        except Exception as e:
            logger.warning(f"Neo4j queries failed: {e} — returning empty insights")
            return GraphInsights(neo4j_available=False)

        return insights
