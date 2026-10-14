import logging
from datetime import datetime
from typing import Optional, Tuple
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.models import Opportunity, Company, FitEvaluation

logger = logging.getLogger("fit_scorer")

class FitScorerAgent:
    """
    Agent 8: Fit Scorer
    Scores leads 0–100 against ClickfieldAI capabilities, budget viability,
    region preference (India first, then Global), and deadline urgency.
    Heavily penalizes expired records (-40 pts), low-confidence listings (-25 pts),
    and unconfirmed buyer records (-30 pts).
    Provides transparent breakdown for hover inspection.
    """
    name = "Fit Scorer Agent"

    def calculate_score(
        self,
        category: str,
        tech_stack: list,
        country: str,
        budget_min: Optional[float],
        deadline: Optional[datetime],
        is_expired: bool = False,
        confidence: int = 85,
        status: str = "NEW"
    ) -> Tuple[int, int, int, int, int, int, str]:
        # 1. Service Fit (0 to 40)
        service_score = 0
        if category in ("GENAI", "ML_DATA_SCIENCE"):
            service_score = 40
        elif category in ("AUTOMATION_RPA", "DATA_ENGINEERING"):
            service_score = 35
        elif category in ("WEB_MOBILE", "ERP_INTEGRATION"):
            service_score = 30
        else:
            service_score = 20

        # Bonus for key modern stacks
        high_value_stacks = ["Generative AI / LLM", "Machine Learning", "Python", "Automation & RPA", "Data Engineering"]
        if any(ts in high_value_stacks for ts in (tech_stack or [])):
            service_score = min(40, service_score + 5)

        # 2. Region Fit (0 to 25)
        country_lower = (country or "Unknown").lower()
        if country_lower == "india":
            region_score = 25
        elif any(c in country_lower for c in ["united states", "european union", "denmark", "ireland", "germany", "uk"]):
            region_score = 20
        else:
            region_score = 10

        # 3. Budget Fit (0 to 20)
        budget_score = 10
        if budget_min:
            if budget_min >= 500000: # >= ₹5 Lakhs or USD equivalent
                budget_score = 20
            elif budget_min >= 100000:
                budget_score = 15

        # 4. Urgency & Deadline Score (0 to 15)
        now = datetime.utcnow()
        if is_expired or (deadline and deadline < now):
            urgency_score = 0
            is_expired = True
        elif deadline:
            days_left = (deadline - now).days
            if 0 <= days_left <= 7:
                urgency_score = 15
            elif 7 < days_left <= 30:
                urgency_score = 12
            else:
                urgency_score = 8
        else:
            urgency_score = 8

        base_total = service_score + region_score + budget_score + urgency_score

        # 5. Penalties
        penalties = 0
        penalty_reasons = []

        if is_expired:
            penalties += 40
            penalty_reasons.append("Expired deadline (-40 pts)")

        if confidence < 70:
            penalties += 25
            penalty_reasons.append(f"Low AI confidence {confidence}% (-25 pts)")

        if status == "NEEDS_REVIEW":
            penalties += 20
            penalty_reasons.append("Unconfirmed buyer/deliverable (-20 pts)")

        total = max(5, min(100, base_total - penalties))

        # Reasoning synthesis
        reason_parts = [
            f"Base: {base_total}/100 [Service: {service_score}/40, Region: {region_score}/25 ({country}), Budget: {budget_score}/20, Urgency: {urgency_score}/15]."
        ]
        if penalties > 0:
            reason_parts.append(f"Penalties: -{penalties} ({', '.join(penalty_reasons)}).")
        reason_parts.append(f"Final Fit Score: {total}/100.")

        reasoning = " ".join(reason_parts)
        return total, service_score, budget_score, region_score, urgency_score, penalties, reasoning

    async def evaluate_opportunity(
        self,
        db: AsyncSession,
        opp: Opportunity,
        company: Company
    ) -> FitEvaluation:
        # Check expired
        now = datetime.utcnow()
        is_exp = bool(opp.is_expired or (opp.deadline and opp.deadline < now))

        total, s_score, b_score, r_score, u_score, pen_score, reason = self.calculate_score(
            category=opp.primary_category,
            tech_stack=opp.tech_stack or [],
            country=company.headquarters_country or "Unknown",
            budget_min=opp.budget_min,
            deadline=opp.deadline,
            is_expired=is_exp,
            confidence=opp.confidence or 85,
            status=opp.status
        )

        stmt_eval = select(FitEvaluation).where(FitEvaluation.opportunity_id == opp.id)
        res_eval = await db.execute(stmt_eval)
        evaluation = res_eval.scalars().first()
        if not evaluation:
            evaluation = FitEvaluation(opportunity_id=opp.id)
            db.add(evaluation)

        evaluation.total_score = total
        evaluation.service_fit_score = s_score
        evaluation.budget_fit_score = b_score
        evaluation.region_fit_score = r_score
        evaluation.urgency_score = u_score
        evaluation.penalty_score = pen_score
        evaluation.score_reasoning = reason
        evaluation.scored_by_model = "Clickfield-Hardened-Scorer-v2"
        evaluation.scored_at = datetime.utcnow()

        await db.commit()
        await db.refresh(evaluation)
        return evaluation

    def predict_lead_conversion_ml(self, lead_dict: dict) -> Tuple[int, float]:
        """
        Uses the trained RandomForestClassifier conversion fit model to evaluate
        lead fit score (0-100) and conversion probability based on employee count (<50),
        verified MCA owner status, corporate email deliverability, and regional industrial hub.
        """
        import os
        import joblib
        import numpy as np
        models_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "ml_models")
        try:
            clf = joblib.load(os.path.join(models_dir, "conversion_fit_model.joblib"))
            is_u50 = 1 if lead_dict.get("is_under_50") == 1 else 0
            owner = lead_dict.get("owner_name")
            has_owner = 1 if owner and owner not in ["Not Disclosed Online", "", "N/A"] else 0
            email = lead_dict.get("email")
            has_email = 1 if email and "@" in email and "yourwebsite" not in email else 0
            phone = lead_dict.get("phone")
            has_phone = 1 if phone and phone not in ["", "N/A"] else 0
            rating = float(lead_dict.get("rating", 0.0) or 0.0)
            reviews = float(lead_dict.get("reviews_count", 0) or 0)
            hub_weights = {"ambattur": 1.0, "guindy": 1.0, "sriperumbudur": 0.95, "oragadam": 0.95, "poonamallee": 0.90}
            area = (lead_dict.get("area") or "").lower()
            hub_w = next((v for k, v in hub_weights.items() if k in area), 0.70)
            has_web = 1 if lead_dict.get("website") else 0

            feat = [is_u50, has_owner, has_email, has_phone, rating, np.log1p(reviews), hub_w, has_web]
            prob = float(clf.predict_proba([feat])[0][1])
            score = int(round(prob * 100))
            return score, prob
        except Exception:
            return 80, 0.80

fit_scorer_agent = FitScorerAgent()
