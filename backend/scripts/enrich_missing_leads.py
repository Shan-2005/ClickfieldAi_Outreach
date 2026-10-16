import sqlite3
import json
import os

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "radar.db")

COMPANY_ENRICHMENT = {
    "Effectplan": {
        "one_liner": "corporate budgeting, financial forecasting, and operational planning software",
        "value_prop": "enabling finance teams to accelerate budget cycles and automate predictive financial models",
        "tags": "financial planning, budgeting, forecasting, operational planning, SaaS"
    },
    "Mitrofresh": {
        "one_liner": "international wholesale distribution of exotic mushrooms and Asian fresh produce",
        "value_prop": "delivering high-efficiency cold chain logistics and fresh food supply across European markets",
        "tags": "exotic mushrooms, Asian produce, cold chain, wholesale distribution, B2B food supply"
    },
    "WashU Digital Intelligence & Innovation (DI2) Accelerator": {
        "one_liner": "accelerating digital intelligence research, AI innovation, and venture incubation",
        "value_prop": "bridging cutting-edge university research with high-impact commercial and technological applications",
        "tags": "digital innovation, artificial intelligence, venture accelerator, higher education"
    },
    "Idea2network": {
        "one_liner": "enterprise AI development, digital transformation, and scalable software solutions",
        "value_prop": "empowering businesses to modernize legacy operations with autonomous intelligence",
        "tags": "enterprise AI, software engineering, digital transformation, cloud architecture"
    },
    "ImproveCX": {
        "one_liner": "customer experience optimization, digital consulting, and enterprise CX architectures",
        "value_prop": "driving customer retention and lifetime value through frictionless omnichannel journeys",
        "tags": "customer experience, CX strategy, digital consulting, customer journeys"
    },
    "Doc Lane's Veterinary Pharmacy": {
        "one_liner": "specialized veterinary compounding and prescription animal health pharmaceuticals",
        "value_prop": "providing custom medication formulations and clinical pharmacy care for veterinary practices",
        "tags": "veterinary pharmacy, compounding, pet health, animal pharmaceuticals"
    },
    "House Of Willow Alexander": {
        "one_liner": "eco-friendly home, garden, and sustainable lifestyle maintenance services",
        "value_prop": "delivering zero-carbon professional estate care and environmental concierge solutions",
        "tags": "sustainable lifestyle, carbon neutral, eco estate management, home care"
    },
    "Norwegian Energy Partners (NORWEP)": {
        "one_liner": "internationalizing the Norwegian energy sector across renewables, oil, and gas",
        "value_prop": "connecting global energy operators with world-class Norwegian technology and engineering",
        "tags": "energy industry, offshore wind, renewables, international energy trade"
    },
    "UK Community Foundations": {
        "one_liner": "coordinating national philanthropy and community endowment funds across the UK",
        "value_prop": "directing dedicated philanthropic capital to grassroots charities and social impact initiatives",
        "tags": "philanthropy, grantmaking, community foundation, social impact"
    },
    "AcuTech Solutions": {
        "one_liner": "Oracle Fusion enterprise architectures, Master Data Management, and cloud systems",
        "value_prop": "streamlining mission-critical ERP data pipelines and enterprise digital modernization",
        "tags": "Oracle Fusion, MDM, enterprise architecture, ERP integration"
    },
    "AuroProcure - Transform Your Procurement Operation": {
        "one_liner": "procurement digital transformation, strategic sourcing, and supply management consulting",
        "value_prop": "optimizing enterprise spend and vendor governance through automated procurement workflows",
        "tags": "procurement transformation, strategic sourcing, spend analytics, supply chain"
    },
    "Benjamin Barker Group": {
        "one_liner": "classic menswear design, omnichannel fashion retail, and bespoke tailoring",
        "value_prop": "blending timeless craftsmanship with contemporary digital retail experiences",
        "tags": "menswear, apparel retail, omnichannel fashion, tailoring"
    },
    "Astral Solutions Group | Your Finance Digital Transformation Partner": {
        "one_liner": "finance digital transformation, ERP advisory, and automated financial operations",
        "value_prop": "modernizing CFO office workflows with integrated reporting and controls",
        "tags": "finance transformation, ERP advisory, financial reporting, CFO advisory"
    },
    "Var Electrochem Private Limited": {
        "one_liner": "industrial electrochemical equipment manufacturing and specialized process engineering",
        "value_prop": "delivering high-precision manufacturing systems for energy and industrial processing",
        "tags": "electrochemical equipment, industrial machinery, manufacturing, process engineering"
    },
    "Breker Group Consulting": {
        "one_liner": "executive leadership coaching, organizational change, and digital culture transformation",
        "value_prop": "empowering corporate leaders to navigate complex technology shifts and team alignment",
        "tags": "leadership coaching, executive development, change management, digital culture"
    },
    "TISSA Technology": {
        "one_liner": "enterprise integration architecture, API middleware, and cloud systems engineering",
        "value_prop": "unifying complex hybrid IT ecosystems with robust, scalable data connectors",
        "tags": "enterprise integration, API architecture, middleware, cloud solutions"
    },
    "The Next Dynasty": {
        "one_liner": "strategic business consulting, agile project management, and operational restructuring",
        "value_prop": "accelerating corporate transformation initiatives through disciplined delivery frameworks",
        "tags": "business consulting, agile transformation, project management, operational excellence"
    },
    "Aigital Technologies Private Limited": {
        "one_liner": "SAP CX technical advisory, enterprise cloud implementation, and IT consulting",
        "value_prop": "maximizing enterprise software ROI with tailored CRM and customer experience architectures",
        "tags": "SAP CX, enterprise IT, IT consulting, customer experience technology"
    },
    "Roche Diagnostics Asia Pacific": {
        "one_liner": "clinical diagnostic instruments, molecular testing solutions, and healthcare IT",
        "value_prop": "empowering clinical laboratories with precision diagnostic intelligence and patient insights",
        "tags": "clinical diagnostics, healthcare technology, biotechnology, laboratory informatics"
    },
    "Growthlabs": {
        "one_liner": "socio-economic program design, housing technology, and community development platforms",
        "value_prop": "leveraging digital platforms to expand accessible housing and social impact initiatives",
        "tags": "housing programs, social innovation, community impact, digital platforms"
    },
    "Municipal Council of Mbabane": {
        "one_liner": "municipal public administration, civic infrastructure, and urban community governance",
        "value_prop": "delivering modernized citizen services and sustainable urban municipal development",
        "tags": "public administration, smart city, citizen services, municipal governance"
    },
    "LeadCap One": {
        "one_liner": "b2b performance marketing, digital advertising strategy, and lead generation systems",
        "value_prop": "scaling client acquisition pipelines with data-driven audience targeting",
        "tags": "b2b advertising, performance marketing, lead generation, digital acquisition"
    },
    "Carrtelcom": {
        "one_liner": "telecom software development, billing solutions, and communications network systems",
        "value_prop": "delivering high-availability software platforms for telecommunications infrastructure",
        "tags": "telecom software, OSS/BSS, billing platforms, communications"
    },
    "DataLexing": {
        "one_liner": "data analytics engineering, enterprise software development, and AI implementations",
        "value_prop": "transforming complex data streams into automated decision-making engines",
        "tags": "data analytics, enterprise software, AI solutions, data engineering"
    },
    "Future Spark": {
        "one_liner": "digital product strategy, cloud architecture, and modern technology advisory",
        "value_prop": "empowering enterprises to build resilient, next-generation digital platforms",
        "tags": "digital strategy, cloud architecture, IT advisory, modern software"
    },
    "Leasehold Advisory Service (LEASE)": {
        "one_liner": "statutory legal advisory, leaseholder guidance, and residential property law dispute support",
        "value_prop": "providing impartial, authoritative legal guidance to leaseholders and housing stakeholders",
        "tags": "legal advisory, leasehold law, property advisory, public guidance"
    },
    "Multiconsult ASA": {
        "one_liner": "multidisciplinary engineering consultancy, architectural design, and infrastructure planning",
        "value_prop": "engineering sustainable infrastructure and iconic architectural landmarks across the Nordics",
        "tags": "engineering consultancy, architecture, infrastructure planning, civil engineering"
    },
    "Greenpeace غرينبيس": {
        "one_liner": "global environmental advocacy, climate action campaigns, and ecological protection initiatives",
        "value_prop": "driving worldwide systemic change toward renewable energy and environmental conservation",
        "tags": "environmental advocacy, climate action, sustainability, non-profit campaigns"
    },
    "Junior Achievement Américas": {
        "one_liner": "youth entrepreneurship education, financial literacy, and workforce readiness programs",
        "value_prop": "equipping next-generation leaders across Latin America with real-world business acumen",
        "tags": "youth entrepreneurship, financial literacy, workforce readiness, education NGO"
    },
    "Scheinfeld Center for Entrepreneurship & Innovation": {
        "one_liner": "collegiate entrepreneurship education, venture incubation, and small business accelerators",
        "value_prop": "providing emerging founders with seed mentorship, capital access, and business launch tools",
        "tags": "entrepreneurship center, venture incubation, startup mentorship, higher education"
    },
    "Harness Care": {
        "one_liner": "primary care network management, NHS GP practice operations, and integrated community health",
        "value_prop": "streamlining multidisciplinary clinical workflows and expanding proactive patient care",
        "tags": "primary care, NHS network, healthcare operations, clinical management"
    },
    "Berachah Global": {
        "one_liner": "fractional Chief AI Officer advisory, enterprise AI strategy, and digital executive consulting",
        "value_prop": "guiding executive boards in deploying pragmatic artificial intelligence that yields measurable ROI",
        "tags": "fractional CAIO, AI strategy, executive consulting, digital transformation"
    },
    "Nexera Solutions": {
        "one_liner": "business process automation, management consulting, and digital operating model design",
        "value_prop": "eliminating administrative friction and accelerating operational velocity across enterprise units",
        "tags": "business consulting, process automation, operational design, digital solutions"
    },
    "WWF Mozambique": {
        "one_liner": "biodiversity conservation, marine ecosystem stewardship, and sustainable wildlife management",
        "value_prop": "safeguarding critical natural habitats while fostering sustainable local community livelihoods",
        "tags": "conservation, wildlife protection, environmental sustainability, marine stewardship"
    },
    "thinkspedia": {
        "one_liner": "digital media production, online publishing platforms, and content distribution technologies",
        "value_prop": "amplifying audience engagement through modern publishing frameworks and rich digital storytelling",
        "tags": "media production, digital publishing, content technology, editorial platforms"
    },
    "Nebworx": {
        "one_liner": "revenue engineering, performance growth marketing, and digital funnel optimization",
        "value_prop": "engineering scalable growth funnels that consistently maximize customer conversion rates",
        "tags": "revenue engineering, growth marketing, digital funnels, conversion optimization"
    },
    "ASN Inc": {
        "one_liner": "enterprise IT infrastructure management, cybersecurity, and cloud migration services",
        "value_prop": "protecting and modernizing business-critical IT systems with round-the-clock reliability",
        "tags": "IT infrastructure, cybersecurity, cloud migration, managed IT services"
    },
    "SENSOCAR": {
        "one_liner": "load cell manufacturing, precision weighing electronics, and industrial sensor technology",
        "value_prop": "delivering certified, high-accuracy weighing and force measurement instrumentation globally",
        "tags": "load cells, weighing electronics, industrial sensors, instrumentation"
    },
    "The Holding": {
        "one_liner": "strategic investment holding, multi-sector portfolio management, and corporate venture capital",
        "value_prop": "fostering long-term capital appreciation and operational synergies across portfolio companies",
        "tags": "investment holding, portfolio management, private equity, corporate strategy"
    },
    "SAQCC Fire": {
        "one_liner": "fire safety standards qualification, technician certification, and public life-safety compliance",
        "value_prop": "ensuring rigorous regulatory compliance and certified competence across fire protection contractors",
        "tags": "fire safety, certification, public safety, compliance standards"
    },
    "Canning & Coyle Construction": {
        "one_liner": "commercial general contracting, structural engineering, and architectural construction delivery",
        "value_prop": "executing complex commercial developments on schedule with uncompromised build quality",
        "tags": "commercial construction, general contracting, civil engineering, building management"
    },
    "Integrity Engineering Solutions": {
        "one_liner": "flange management software, joint integrity engineering, and pressure vessel safety systems",
        "value_prop": "preventing hazardous industrial leaks and optimizing asset integrity in oil, gas, and mining",
        "tags": "flange management, joint integrity, pressure equipment, engineering software"
    },
    "Media Direction Group": {
        "one_liner": "integrated media buying, communications strategy, and brand campaign planning",
        "value_prop": "maximizing advertising impact and brand equity across television, digital, and outdoor media",
        "tags": "media agency, media planning, communications, advertising strategy"
    },
    "iSavvy Digital Africa Limited": {
        "one_liner": "fintech software architectures, mobile payments engineering, and African digital enablement",
        "value_prop": "expanding inclusive digital financial services and scalable cloud products across the continent",
        "tags": "fintech, mobile software, digital Africa, cloud enablement"
    },
    "Homewell Practice": {
        "one_liner": "NHS primary healthcare delivery, GP practice management, and family medicine services",
        "value_prop": "providing compassionate, responsive primary medical care and chronic disease management",
        "tags": "NHS practice, GP medical clinic, family healthcare, primary care"
    },
    "Worthing Medical Group": {
        "one_liner": "comprehensive GP medical practice, multi-site clinical operations, and preventive care",
        "value_prop": "delivering accessible patient consultations and modernized appointment management",
        "tags": "primary care, medical group, GP surgery, healthcare operations"
    },
    "ELiNA Services": {
        "one_liner": "education administration software, international student recruitment, and academic consulting",
        "value_prop": "streamlining university admissions workflows and student placement programs worldwide",
        "tags": "education administration, academic placement, student recruitment, EdTech"
    },
    "Pharmacy  and Medicines Regulatory Authority": {
        "one_liner": "national pharmaceutical regulation, medicines quality assurance, and pharmacy licensing",
        "value_prop": "protecting public health by enforcing stringent drug safety standards and therapeutic efficacy",
        "tags": "pharmaceutical regulation, medicine inspection, public health, licensing authority"
    },
    "QualiValue": {
        "one_liner": "quality management systems consulting, ISO certification advisory, and business excellence",
        "value_prop": "guiding organizations to achieve internationally audited quality benchmarks and process controls",
        "tags": "quality management, ISO consulting, business excellence, compliance audits"
    },
    "ElectroGalicia": {
        "one_liner": "electrical installations, high-voltage industrial engineering, and renewable energy grids",
        "value_prop": "delivering certified, energy-efficient electrical contracting for industrial and civic facilities",
        "tags": "electrical engineering, high voltage, renewable installations, electrical contracting"
    },
    "Cadem AS.": {
        "one_liner": "Dassault Systèmes PLM software integration, 3D CAD engineering, and industrial simulation",
        "value_prop": "optimizing product lifecycle management and digital twin engineering for industrial manufacturers",
        "tags": "PLM software, Dassault Systèmes, CAD simulation, digital twin"
    },
    "Tectura India": {
        "one_liner": "Microsoft Dynamics 365 ERP & CRM implementations and enterprise cloud advisory",
        "value_prop": "accelerating manufacturing and retail operations with certified Microsoft business applications",
        "tags": "Microsoft Dynamics 365, ERP implementation, CRM, enterprise software"
    },
    "Lamdah": {
        "one_liner": "enterprise cloud solutions, bespoke portal development, and digital workspace platforms",
        "value_prop": "creating secure, high-productivity digital workplace environments for regional enterprises",
        "tags": "cloud solutions, digital workspace, portal development, enterprise IT"
    },
    "dreamspaces | AI CX Intelligence": {
        "one_liner": "AI-driven customer experience intelligence, behavioral analytics, and conversational agents",
        "value_prop": "decoding customer sentiment in real time to deliver proactive, automated brand interactions",
        "tags": "AI CX, sentiment intelligence, conversational agents, customer analytics"
    },
    "4Sight OT Optimisation": {
        "one_liner": "operational technology (OT) optimization, industrial automation, and smart factory telemetry",
        "value_prop": "bridging shop-floor PLC telemetry with enterprise cloud systems for predictive manufacturing",
        "tags": "OT optimization, SCADA, industrial automation, predictive maintenance"
    },
    "Kounouz Travel": {
        "one_liner": "luxury destination travel management, corporate travel logistics, and VIP tour curation",
        "value_prop": "curating tailored cultural itineraries and seamless executive travel arrangements",
        "tags": "travel agency, corporate travel, luxury tours, itinerary management"
    },
    "The Precursorius": {
        "one_liner": "executive interim management, organizational restructuring, and transformation advisory",
        "value_prop": "deploying veteran leadership to steer high-stakes corporate turnarounds and tech adoptions",
        "tags": "interim management, transformation advisory, corporate turnaround, change leadership"
    },
    "EOSIX": {
        "one_liner": "virtual reality industrial safety simulations, immersive 3D training, and hazard modeling",
        "value_prop": "reducing industrial workplace accidents through realistic, interactive simulation environments",
        "tags": "VR safety training, industrial simulation, 3D modeling, workplace safety"
    },
    "Avineer IT Technologies": {
        "one_liner": "custom software engineering, mobile application development, and cloud modernizations",
        "value_prop": "building agile, high-performance web and mobile platforms for growing enterprises",
        "tags": "custom software, mobile development, cloud migration, IT services"
    },
    "FAS Tech • Digital Solutions": {
        "one_liner": "fintech digital banking architectures, payment gateways, and regulatory software engineering",
        "value_prop": "enabling financial institutions to deploy secure, next-generation digital banking services",
        "tags": "fintech solutions, digital banking, payment systems, financial IT"
    },
    "Existence": {
        "one_liner": "sustainable Japanese designer menswear, organic textile curation, and MARKAWARE fashion",
        "value_prop": "uniting ethical natural textiles with meticulous minimalist tailoring for modern wardrobes",
        "tags": "designer fashion, sustainable menswear, MARKAWARE, luxury apparel"
    },
    "IBridge": {
        "one_liner": "cross-border trade facilitation software, diaspora remittance systems, and African commerce",
        "value_prop": "connecting African businesses with frictionless global payment and logistics corridors",
        "tags": "trade software, diaspora finance, cross-border payments, African commerce"
    },
    "Jvs Switchgears": {
        "one_liner": "high-voltage switchgear engineering, electrical power distribution panels, and substation systems",
        "value_prop": "manufacturing robust, safety-certified electrical distribution gear for power utilities and factories",
        "tags": "switchgears, electrical panels, power distribution, electrical engineering"
    },
    "Nmhealthinnovations": {
        "one_liner": "population health management platforms, preventative clinical programs, and community care",
        "value_prop": "analyzing demographic health data to proactively improve community chronic illness outcomes",
        "tags": "population health, preventive medicine, healthcare analytics, community health"
    }
}

def enrich_all_leads():
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    cur.execute("SELECT id, company_name, recipient_first_name FROM outreach_dataset_leads")
    leads = cur.fetchall()

    updated_count = 0
    for lead_id, comp_name, first_name in leads:
        fname = first_name or "there"
        if comp_name in COMPANY_ENRICHMENT:
            data = COMPANY_ENRICHMENT[comp_name]
            one_liner = data["one_liner"]
            val_prop = data["value_prop"]
            tags = data["tags"]

            subject = f"Quick note regarding {comp_name}"
            body = (
                f"Hi {fname},\n\n"
                f"I was reviewing {comp_name}'s work in {one_liner} and your focus on {val_prop}.\n\n"
                f"Or your Company might be thought of some Ai automation to be done in your Day-to-day work , involving from employee management and client acquisition report management or Ticketing Management.\n"
                f"and We provide you the solutions .\n\n"
                f"If you'd be open to seeing a 2-minute breakdown of how we support teams like {comp_name}, just reply Yes.\n\n"
                f"Best,\n"
                f"Zoya\n"
                f"ClickfieldAI"
            )

            cur.execute("""
                UPDATE outreach_dataset_leads
                SET ai_one_liner = ?, value_proposition = ?, service_tags = ?,
                    draft_subject = ?, draft_body = ?
                WHERE id = ?
            """, (one_liner, val_prop, tags, subject, body, lead_id))
            updated_count += 1

    conn.commit()
    conn.close()
    print(f"Enriched and updated {updated_count} leads successfully.")

if __name__ == "__main__":
    enrich_all_leads()
