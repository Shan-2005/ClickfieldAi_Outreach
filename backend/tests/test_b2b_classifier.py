import os
import sys
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.agents.classifier import classifier_agent

TEST_DATASET = [
    # =========================================================================
    # 15 JOB POSTINGS / STAFF AUGMENTATION (EXPECTED: REJECT / is_b2b_project = False)
    # =========================================================================
    {
        "id": "JOB_01",
        "title": "Senior Python & GenAI Engineer - Full-time, $140k-$160k + Benefits",
        "description": "We are hiring a Senior Python Engineer to join our core AI engineering team. Full-time position with health benefits and 401k match. Apply with your resume and GitHub profile.",
        "expected_b2b": False,
        "label": "Job Posting (Full-time)"
    },
    {
        "id": "JOB_02",
        "title": "Junior React Developer Job Opening at TechCorp. CTC 6-8 LPA",
        "description": "TechCorp has an urgent vacancy for React Developer. Minimum 2 years of experience required. CTC: 6-8 LPA. Notice period: immediate to 15 days. Apply with CV.",
        "expected_b2b": False,
        "label": "Job Posting (CTC / Vacancy)"
    },
    {
        "id": "JOB_03",
        "title": "We are hiring: Machine Learning Intern (3 months internship)",
        "description": "Exciting internship opportunity for ML enthusiasts. Stipend: Rs 25,000/month. Looking for college students with Python and PyTorch knowledge to join our team.",
        "expected_b2b": False,
        "label": "Job Posting (Internship)"
    },
    {
        "id": "JOB_04",
        "title": "DevOps Engineer Vacancy - 5+ years of experience required",
        "description": "Job opening for DevOps Lead with 5+ yrs experience in AWS and Kubernetes. Salary competitive. Candidates must submit resume before Friday.",
        "expected_b2b": False,
        "label": "Job Posting (Years of Experience)"
    },
    {
        "id": "JOB_05",
        "title": "Contract developer needed for 3 months to work on Django codebase",
        "description": "We need an individual contractor for 3 months staff augmentation to help our internal engineering team clear backend tickets. $40/hour.",
        "expected_b2b": False,
        "label": "Job Posting (Staff Augmentation Edge Case)"
    },
    {
        "id": "JOB_06",
        "title": "Walk-in interview for Java Fullstack Developers on Saturday",
        "description": "Walk-in drive for Java Spring Boot engineers at our Bangalore development center. 3-6 years experience required. Bring updated resume and payslips.",
        "expected_b2b": False,
        "label": "Job Posting (Walk-in Drive)"
    },
    {
        "id": "JOB_07",
        "title": "Staff Augmentation: Looking for 2 Python engineers on payroll",
        "description": "Staffing requirement for client deployment. Candidates will be placed on our agency payroll with standard salary benefits.",
        "expected_b2b": False,
        "label": "Job Posting (Agency Payroll)"
    },
    {
        "id": "JOB_08",
        "title": "Talent Acquisition Specialist seeking Data Scientist for US client",
        "description": "Recruiter posting: Urgently screening candidates for Data Scientist role. W2 or 1099 candidate profile. Equal opportunity employer.",
        "expected_b2b": False,
        "label": "Job Posting (Recruiter / Candidate)"
    },
    {
        "id": "JOB_09",
        "title": "Work from home job: Mobile App Developer vacancy",
        "description": "ABC Staffing has an immediate work from home job vacancy for Flutter developers. Fixed monthly salary with probation period of 3 months.",
        "expected_b2b": False,
        "label": "Job Posting (Work from Home Vacancy)"
    },
    {
        "id": "JOB_10",
        "title": "Senior Automation QA Engineer - submit your CV",
        "description": "Global enterprise is looking for a QA automation engineer to join our team. Full-time role, submit your CV to careers@enterprise.com.",
        "expected_b2b": False,
        "label": "Job Posting (Submit CV / Careers)"
    },
    {
        "id": "JOB_11",
        "title": "I am a freelance Full Stack developer with 6 years experience, hire me",
        "description": "I can build your web applications in React and FastAPI. My portfolio is available at developer.dev. Available for hourly freelance work.",
        "expected_b2b": False,
        "label": "Job Posting (Individual Freelancer Pitch)"
    },
    {
        "id": "JOB_12",
        "title": "Looking for a coder to join our startup team as employee",
        "description": "Early stage startup looking for a full stack engineer as an employee. Offering salary plus 1% equity.",
        "expected_b2b": False,
        "label": "Job Posting (Employee Hiring)"
    },
    {
        "id": "JOB_13",
        "title": "Backend Node.js vacancy - candidates must have min 4 years experience",
        "description": "Job alert: Hiring Node.js backend developer. Candidate must have min 4 years of experience and immediate joining.",
        "expected_b2b": False,
        "label": "Job Posting (Candidate / Vacancy)"
    },
    {
        "id": "JOB_14",
        "title": "Staffing firm placing Cloud Architect for staff augmentation contract",
        "description": "Recruitment agency looking for Cloud Architect. Client needs temporary staffing for infrastructure team.",
        "expected_b2b": False,
        "label": "Job Posting (Staffing Firm)"
    },
    {
        "id": "JOB_15",
        "title": "I need someone to help me with my python programming homework",
        "description": "Can someone help me with my university coding assignment? Will pay $25 via PayPal.",
        "expected_b2b": False,
        "label": "Job Posting (Individual Helper / Student)"
    },

    # =========================================================================
    # 15 REAL B2B PROJECT OPPORTUNITIES (EXPECTED: ACCEPT / is_b2b_project = True)
    # =========================================================================
    {
        "id": "B2B_01",
        "title": "Notice Inviting Tender (NIT): Development of Enterprise AI Document Portal",
        "description": "Municipal Corporation of Greater Mumbai invites commercial and technical bids from reputed software agencies for development, deployment and maintenance of AI-powered document verification system.",
        "expected_b2b": True,
        "label": "B2B Project (Govt NIT Tender)"
    },
    {
        "id": "B2B_02",
        "title": "Request for Proposal (RFP): Turnkey GenAI Knowledge Assistant for Grid Corp",
        "description": "National Power Grid Corporation invites proposals from technology vendors for turnkey implementation of a secure on-premise Large Language Model RAG architecture.",
        "expected_b2b": True,
        "label": "B2B Project (Enterprise RFP)"
    },
    {
        "id": "B2B_03",
        "title": "Expression of Interest (EOI): Empanelment of Specialized IT Vendors",
        "description": "State Electronics Development Corporation invites EOI from qualified software engineering firms for empanelment as cloud native application modernization partners.",
        "expected_b2b": True,
        "label": "B2B Project (Vendor Empanelment EOI)"
    },
    {
        "id": "B2B_04",
        "title": "GeM Bid: Supply, Installation and Commissioning of Computer Vision Traffic System",
        "description": "Public Works Department issues GeM Bid Document No. GEM/2026/B/8912 for turnkey software development, camera edge analytics and 3-year support.",
        "expected_b2b": True,
        "label": "B2B Project (GeM Bid Document)"
    },
    {
        "id": "B2B_05",
        "title": "UNDP RFP Notice: Development of Open Source Digital Public Good Analytics Platform",
        "description": "United Nations Development Programme (UNDP) invites competitive proposals from software solution providers for building microservices architecture for climate data.",
        "expected_b2b": True,
        "label": "B2B Project (UN / NGO RFP)"
    },
    {
        "id": "B2B_06",
        "title": "Tender for System Integrator: Design and Development of Centralized e-Governance Portal",
        "description": "Ministry of Digital Services invites technical bids from IT system integrators for end-to-end design, implementation and SLA-backed management of citizen portal.",
        "expected_b2b": True,
        "label": "B2B Project (Ministry Tender)"
    },
    {
        "id": "B2B_07",
        "title": "University of Technology RFP: Fixed-scope Campus Management ERP Development",
        "description": "State University invites detailed RFP proposals from enterprise software companies to build a custom student information system and mobile portal with defined milestone deliverables.",
        "expected_b2b": True,
        "label": "B2B Project (University RFP)"
    },
    {
        "id": "B2B_08",
        "title": "State Health Mission: Call for Proposals for Telemedicine Platform Development",
        "description": "State Health Mission invites software development agencies to submit proposals for building a scalable remote patient monitoring platform with HL7 and FHIR integration.",
        "expected_b2b": True,
        "label": "B2B Project (Call for Proposals)"
    },
    {
        "id": "B2B_09",
        "title": "Vendor Solicitation: Enterprise RPA Bot Development for SAP Invoicing Workflows",
        "description": "Global Manufacturing Conglomerate issues vendor solicitation for automating accounts payable processes using custom RPA bots and OCR pipelines.",
        "expected_b2b": True,
        "label": "B2B Project (Vendor Solicitation)"
    },
    {
        "id": "B2B_10",
        "title": "Build us a fixed-scope mobile app for logistics tracking, submit proposal by date",
        "description": "Apex Logistics Corporation requires a specialized agency to build a custom cross-platform driver tracking application. Fixed-scope contract, proposals due by 15th November.",
        "expected_b2b": True,
        "label": "B2B Project (Fixed-scope App Deliverable)"
    },
    {
        "id": "B2B_11",
        "title": "TED Europa Contract Notice: IT Software Development and API Gateway Services",
        "description": "European Transport Authority publishes public procurement tender notice for custom software development, modern API management and systems integration.",
        "expected_b2b": True,
        "label": "B2B Project (TED Europa Tender)"
    },
    {
        "id": "B2B_12",
        "title": "Fintech Corporation RFP: Seeking Technology Partner for Microservices Migration",
        "description": "Leading Payment Service Provider invites RFP submissions from software engineering consultancies for legacy backend modernization and microservices deployment.",
        "expected_b2b": True,
        "label": "B2B Project (Fintech Technology Partner)"
    },
    {
        "id": "B2B_13",
        "title": "Notice Inviting Bids: Turnkey Development of IoT Sensor Telemetry Dashboard",
        "description": "State Water Authority invites bids for turnkey supply and custom web portal engineering to ingest real-time flow telemetry across 450 monitoring stations.",
        "expected_b2b": True,
        "label": "B2B Project (Turnkey IoT Tender)"
    },
    {
        "id": "B2B_14",
        "title": "Port Authority Tender: End-to-End Container Tracking Software Development",
        "description": "National Maritime Port Authority announces tender for turnkey development of cloud-based container logistics software with milestone deliverables.",
        "expected_b2b": True,
        "label": "B2B Project (Port Authority Tender)"
    },
    {
        "id": "B2B_15",
        "title": "Milestone-based Project: Full-stack Development of AI Medical Imaging Triage Workflow",
        "description": "BioTech Research Institute requires an external development agency to deliver fixed-scope DICOM viewer and AI inference pipeline. Fixed contract budget $45,000.",
        "expected_b2b": True,
        "label": "B2B Project (Milestone Deliverable)"
    }
]

def run_evaluation():
    print("=" * 80)
    print("CLICKFIELDAI B2B CLASSIFIER EVALUATION (30 LABELED BENCHMARK SAMPLES)")
    print("=" * 80)

    tp = 0 # B2B correctly accepted
    tn = 0 # Job correctly rejected
    fp = 0 # Job mistakenly accepted (CRITICAL FAILURE TARGET < 3%)
    fn = 0 # B2B mistakenly rejected

    failures = []

    for item in TEST_DATASET:
        result = classifier_agent.classify(
            title=item["title"],
            description=item["description"],
            tech_stack=[],
            source_url=""
        )

        is_accepted = result.is_b2b_project
        expected = item["expected_b2b"]

        if expected is True and is_accepted is True:
            tp += 1
            status_str = "[PASS ACCEPTED]"
        elif expected is False and is_accepted is False:
            tn += 1
            status_str = "[PASS REJECTED]"
        elif expected is False and is_accepted is True:
            fp += 1
            status_str = "[FAIL LEAKED JOB]"
            failures.append({
                "id": item["id"],
                "type": "FALSE POSITIVE (Job Leaked as Project)",
                "title": item["title"],
                "result": result
            })
        else: # expected True, got False
            fn += 1
            status_str = "[FAIL REJECTED B2B]"
            failures.append({
                "id": item["id"],
                "type": "FALSE NEGATIVE (B2B Project Mistakenly Rejected)",
                "title": item["title"],
                "reason": result.rejection_reason
            })

        print(f"{status_str:<18} | {item['id']:<7} | Type: {result.opportunity_type:<12} | Conf: {result.confidence}% | {item['title'][:55]}...")

    total = len(TEST_DATASET)
    total_jobs = sum(1 for x in TEST_DATASET if not x["expected_b2b"])
    total_b2b = sum(1 for x in TEST_DATASET if x["expected_b2b"])

    accuracy = ((tp + tn) / total) * 100
    precision = (tp / (tp + fp)) * 100 if (tp + fp) > 0 else 0
    recall = (tp / (tp + fn)) * 100 if (tp + fn) > 0 else 0
    f1 = (2 * precision * recall) / (precision + recall) if (precision + recall) > 0 else 0
    job_leakage_rate = (fp / total_jobs) * 100

    print("\n" + "=" * 80)
    print("EVALUATION METRICS & BENCHMARK REPORT:")
    print("=" * 80)
    print(f"Total Tested Samples:              {total}")
    print(f"Total True Job Postings:           {total_jobs}")
    print(f"Total True B2B Project Requests:   {total_b2b}")
    print("-" * 50)
    print(f"True Positives (B2B Accepted):     {tp} / {total_b2b}")
    print(f"True Negatives (Jobs Blocked):     {tn} / {total_jobs}")
    print(f"False Positives (Jobs Leaked):     {fp} / {total_jobs} ({job_leakage_rate:.1f}%) [TARGET: < 3%]")
    print(f"False Negatives (B2B Blocked):     {fn} / {total_b2b}")
    print("-" * 50)
    print(f"Classification Accuracy:           {accuracy:.2f}%")
    print(f"Precision:                         {precision:.2f}%")
    print(f"Recall:                            {recall:.2f}%")
    print(f"F1-Score:                          {f1:.2f}%")
    print("=" * 80)

    if failures:
        print("\nFAILURE AUDIT DETAILS:")
        for f in failures:
            print(f"- [{f['type']}] {f['title']}")
            if 'reason' in f:
                print(f"  Rejection Reason: {f['reason']}")
    else:
        print("\nSUCCESS: 0 FAILURES! 100% of Job Postings blocked (0.0% leakage). 100% of B2B projects accepted.")

if __name__ == "__main__":
    run_evaluation()
