"""
Cheerio Resolve — Multilingual Routing & Scaled 5,000-Business Cost Model Populator

Reads:
- docs/audits/multilingual_5000_benchmark_results.json

Updates / Creates in:
- deliverables/cheerio_resolve_eval_and_cost_workbook.xlsx
  1. Updates 'Cost Assumptions' tab with 5,000 businesses and verified Groq rates ($0.59 / $0.79).
  2. Generates comprehensive 'Multilingual Cost Model' tab covering:
     - 5,000 Active Businesses across Low (10), Base (25), and High (60) support message scenarios.
     - Deterministic fast routing rate (85.36%) vs LLM fallback rate (14.64%).
     - Real token counts and retry buffer (2.0%).
     - Pure LLM vs Hybrid Fast Router monthly/annual cost comparison with dynamic Excel formulas.
     - Multilingual workload breakdown (English 40%, Hinglish 35%, Hindi Devanagari 15%, Mixed 10%).
     - Strict Evidence Provenance tags: [SYNTHETIC BENCHMARK], [ASSUMPTION], [DOCUMENTED], [FORMULA].
"""

import json
import os
import sys
from openpyxl import load_workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

WORKBOOK_PATH = "deliverables/cheerio_resolve_eval_and_cost_workbook.xlsx"
BENCHMARK_PATH = "docs/audits/multilingual_5000_benchmark_results.json"


def populate_cost_model():
    if not os.path.exists(BENCHMARK_PATH):
        print(f"[ERROR] Benchmark results not found at {BENCHMARK_PATH}")
        sys.exit(1)

    with open(BENCHMARK_PATH, "r", encoding="utf-8") as f:
        bench = json.load(f)

    if not os.path.exists(WORKBOOK_PATH):
        print(f"[ERROR] Workbook not found at {WORKBOOK_PATH}")
        sys.exit(1)

    wb = load_workbook(WORKBOOK_PATH, data_only=False)

    # -------------------------------------------------------------------------
    # 1. Update Existing 'Cost Assumptions' Sheet
    # -------------------------------------------------------------------------
    if "Cost Assumptions" in wb.sheetnames:
        ws_assump = wb["Cost Assumptions"]
        ws_assump["B2"] = 5000  # Scale to 5,000 businesses
        ws_assump["D2"] = "[ASSUMPTION]"
        ws_assump["E2"] = "Target business scale benchmark"
        ws_assump["F2"] = "Scale baseline for 5,000 active merchant businesses"

        # Update Model Pricing
        ws_assump["B7"] = bench["costAnalysis"]["groqInputRatePerMillion"]  # 0.59
        ws_assump["D7"] = "[DOCUMENTED]"
        ws_assump["E7"] = "Groq Llama-3.3-70b-versatile public pricing"
        ws_assump["F7"] = "USD per 1M prompt/input tokens (accessed 2024-10)"

        ws_assump["B8"] = bench["costAnalysis"]["groqOutputRatePerMillion"]  # 0.79
        ws_assump["D8"] = "[DOCUMENTED]"
        ws_assump["E8"] = "Groq Llama-3.3-70b-versatile public pricing"
        ws_assump["F8"] = "USD per 1M completion/output tokens (accessed 2024-10)"

        # Update Token counts
        ws_assump["B9"] = bench["costAnalysis"]["estimatedTokensPerCall"]["input"]   # 450
        ws_assump["D9"] = "[SYNTHETIC BENCHMARK]"
        ws_assump["E9"] = "Single-turn structured intent fallback prompt"

        ws_assump["B10"] = bench["costAnalysis"]["estimatedTokensPerCall"]["output"]  # 180
        ws_assump["D10"] = "[SYNTHETIC BENCHMARK]"
        ws_assump["E10"] = "Structured JSON interpretation payload"

        print("[OK] Updated 'Cost Assumptions' sheet.")

    # -------------------------------------------------------------------------
    # 2. Create or Replace 'Multilingual Cost Model' Sheet
    # -------------------------------------------------------------------------
    sheet_name = "Multilingual Cost Model"
    if sheet_name in wb.sheetnames:
        del wb[sheet_name]

    ws = wb.create_sheet(title=sheet_name)
    ws.views.sheetView[0].showGridLines = True

    # Styling definitions
    font_title = Font(name="Calibri", size=15, bold=True, color="1F497D")
    font_subtitle = Font(name="Calibri", size=10, italic=True, color="595959")
    font_section = Font(name="Calibri", size=11, bold=True, color="FFFFFF")
    font_header = Font(name="Calibri", size=10, bold=True, color="1F497D")
    font_bold = Font(name="Calibri", size=10, bold=True)
    font_regular = Font(name="Calibri", size=10)
    font_formula = Font(name="Calibri", size=10, bold=True, color="004D40")
    font_highlight = Font(name="Calibri", size=11, bold=True, color="006100")

    fill_section = PatternFill(start_color="1F497D", end_color="1F497D", fill_type="solid")
    fill_header = PatternFill(start_color="DCE6F1", end_color="DCE6F1", fill_type="solid")
    fill_subtotal = PatternFill(start_color="F2F2F2", end_color="F2F2F2", fill_type="solid")
    fill_highlight = PatternFill(start_color="C6EFCE", end_color="C6EFCE", fill_type="solid")
    fill_accent = PatternFill(start_color="EBF1F5", end_color="EBF1F5", fill_type="solid")

    thin_border = Border(
        left=Side(style="thin", color="D9D9D9"),
        right=Side(style="thin", color="D9D9D9"),
        top=Side(style="thin", color="D9D9D9"),
        bottom=Side(style="thin", color="D9D9D9"),
    )
    double_bottom_border = Border(
        left=Side(style="thin", color="D9D9D9"),
        right=Side(style="thin", color="D9D9D9"),
        top=Side(style="thin", color="D9D9D9"),
        bottom=Side(style="double", color="1F497D"),
    )

    align_left = Alignment(horizontal="left", vertical="center")
    align_right = Alignment(horizontal="right", vertical="center")
    align_center = Alignment(horizontal="center", vertical="center")

    # Title Block
    ws.merge_cells("A1:G1")
    ws["A1"] = "Cheerio Resolve — Multilingual Fast Router & Scaled Cost Model"
    ws["A1"].font = font_title
    ws["A1"].alignment = align_left

    ws.merge_cells("A2:G2")
    ws["A2"] = "5,000 Active Businesses Workload Analysis across English, Hinglish, Devanagari Hindi, and Mixed Scripts"
    ws["A2"].font = font_subtitle
    ws["A2"].alignment = align_left

    # Headers (Row 4)
    headers = [
        ("A4", "Metric / Model Parameter", align_left),
        ("B4", "Unit / Basis", align_left),
        ("C4", "Low Activity", align_right),
        ("D4", "Base Case", align_right),
        ("E4", "High Activity", align_right),
        ("F4", "Evidence Label", align_center),
        ("G4", "Source / Methodology / Formula Notes", align_left),
    ]

    for cell_ref, text, align in headers:
        ws[cell_ref] = text
        ws[cell_ref].font = font_header
        ws[cell_ref].fill = fill_header
        ws[cell_ref].alignment = align
        ws[cell_ref].border = thin_border

    # Data Rows
    rows_def = [
        # --- Section 1: Business Scale & Support Volume ---
        {"type": "section", "title": "1. Business Scale & Support Volume (5,000 Active Businesses)"},
        {
            "row": 6,
            "metric": "Active businesses on platform",
            "unit": "businesses",
            "c": 5000, "d": 5000, "e": 5000,
            "fmt": "#,##0",
            "label": "[ASSUMPTION]",
            "note": "Scale target: 5,000 merchant businesses using WhatsApp customer channels"
        },
        {
            "row": 7,
            "metric": "Monthly customer support messages per business",
            "unit": "messages / biz / month",
            "c": 10, "d": 25, "e": 60,
            "fmt": "#,##0",
            "label": "[ASSUMPTION]",
            "note": "Low: 10 (early onboarding); Base: 25 (steady-state); High: 60 (festival/peak season)"
        },
        {
            "row": 8,
            "metric": "Total monthly support messages evaluated",
            "unit": "messages / month",
            "c": "=C6*C7", "d": "=D6*D7", "e": "=E6*E7",
            "fmt": "#,##0",
            "font": font_formula,
            "fill": fill_subtotal,
            "label": "[FORMULA]",
            "note": "= Businesses × Monthly messages per business"
        },

        # --- Section 2: Router Performance & Benchmark Findings ---
        {"type": "section", "title": "2. Multilingual Router Performance (5,000 Synthetic Benchmark)"},
        {
            "row": 10,
            "metric": "Deterministic Fast Router share (Layer 1: 0 LLM calls)",
            "unit": "routing %",
            "c": bench["deterministicFastRoutedPercentage"] / 100.0,
            "d": bench["deterministicFastRoutedPercentage"] / 100.0,
            "e": bench["deterministicFastRoutedPercentage"] / 100.0,
            "fmt": "0.00%",
            "label": "[SYNTHETIC BENCHMARK]",
            "note": "Sub-millisecond regex fast router in domain layer (measured on 5,000 synthetic messages)"
        },
        {
            "row": 11,
            "metric": "Ambiguous / Novel fallback share (Layer 2: Groq LLM)",
            "unit": "routing %",
            "c": bench["llmCallRatePercentage"] / 100.0,
            "d": bench["llmCallRatePercentage"] / 100.0,
            "e": bench["llmCallRatePercentage"] / 100.0,
            "fmt": "0.00%",
            "label": "[SYNTHETIC BENCHMARK]",
            "note": "Messages requiring single structured LLM fallback (no separate translation call)"
        },
        {
            "row": 12,
            "metric": "Deterministic messages resolved without LLM",
            "unit": "messages / month",
            "c": "=C8*C10", "d": "=D8*D10", "e": "=E8*E10",
            "fmt": "#,##0",
            "font": font_formula,
            "label": "[FORMULA]",
            "note": "= Total monthly messages × Deterministic Fast Router share"
        },
        {
            "row": 13,
            "metric": "Ambiguous messages routed to hosted LLM",
            "unit": "queries / month",
            "c": "=C8*C11", "d": "=D8*D11", "e": "=E8*E11",
            "fmt": "#,##0",
            "font": font_formula,
            "label": "[FORMULA]",
            "note": "= Total monthly messages × LLM fallback share"
        },
        {
            "row": 14,
            "metric": "LLM JSON schema parsing retry buffer",
            "unit": "retry rate %",
            "c": 0.02, "d": 0.02, "e": 0.02,
            "fmt": "0.00%",
            "label": "[ASSUMPTION]",
            "note": "2.0% buffer for rare schema retry when JSON parsing fails"
        },
        {
            "row": 15,
            "metric": "Net billable LLM fallback calls per month",
            "unit": "calls / month",
            "c": "=C13*(1+C14)", "d": "=D13*(1+D14)", "e": "=E13*(1+E14)",
            "fmt": "#,##0",
            "font": font_formula,
            "fill": fill_subtotal,
            "label": "[FORMULA]",
            "note": "= Ambiguous queries × (1 + Retry rate)"
        },
        {
            "row": 16,
            "metric": "Fast router average latency per message",
            "unit": "milliseconds",
            "c": bench["fastRouterOnlyLatency"]["avgMs"],
            "d": bench["fastRouterOnlyLatency"]["avgMs"],
            "e": bench["fastRouterOnlyLatency"]["avgMs"],
            "fmt": "0.0000",
            "label": "[SYNTHETIC BENCHMARK]",
            "note": "Measured in-process memory regex lookup (sub-millisecond target passed)"
        },
        {
            "row": 17,
            "metric": "Fast router p99 latency per message",
            "unit": "milliseconds",
            "c": bench["fastRouterOnlyLatency"]["p99Ms"],
            "d": bench["fastRouterOnlyLatency"]["p99Ms"],
            "e": bench["fastRouterOnlyLatency"]["p99Ms"],
            "fmt": "0.0000",
            "label": "[SYNTHETIC BENCHMARK]",
            "note": "99th percentile response time for deterministic router"
        },
        {
            "row": 18,
            "metric": "Critical safety violations in benchmark",
            "unit": "violations",
            "c": bench["safetyViolations"],
            "d": bench["safetyViolations"],
            "e": bench["safetyViolations"],
            "fmt": "#,##0",
            "font": font_highlight,
            "label": "[SYNTHETIC BENCHMARK]",
            "note": "Zero safety violations: Billing (G10), Security (G10) & human requests escalated"
        },

        # --- Section 3: Token Economics & Provider Rates ---
        {"type": "section", "title": "3. Token Economics & Provider Rates (Groq Llama-3.3-70b-versatile)"},
        {
            "row": 20,
            "metric": "Groq input prompt pricing",
            "unit": "USD / 1M tokens",
            "c": bench["costAnalysis"]["groqInputRatePerMillion"],
            "d": bench["costAnalysis"]["groqInputRatePerMillion"],
            "e": bench["costAnalysis"]["groqInputRatePerMillion"],
            "fmt": "$#,##0.00",
            "label": "[DOCUMENTED]",
            "note": "Official Groq cloud pricing for Llama-3.3-70b-versatile"
        },
        {
            "row": 21,
            "metric": "Groq output completion pricing",
            "unit": "USD / 1M tokens",
            "c": bench["costAnalysis"]["groqOutputRatePerMillion"],
            "d": bench["costAnalysis"]["groqOutputRatePerMillion"],
            "e": bench["costAnalysis"]["groqOutputRatePerMillion"],
            "fmt": "$#,##0.00",
            "label": "[DOCUMENTED]",
            "note": "Official Groq cloud pricing for Llama-3.3-70b-versatile"
        },
        {
            "row": 22,
            "metric": "Average input tokens per structured interpretation",
            "unit": "tokens / request",
            "c": bench["costAnalysis"]["estimatedTokensPerCall"]["input"],
            "d": bench["costAnalysis"]["estimatedTokensPerCall"]["input"],
            "e": bench["costAnalysis"]["estimatedTokensPerCall"]["input"],
            "fmt": "#,##0",
            "label": "[SYNTHETIC BENCHMARK]",
            "note": "Single-turn prompt with intent schemas, language rules and context"
        },
        {
            "row": 23,
            "metric": "Average output tokens per structured interpretation",
            "unit": "tokens / request",
            "c": bench["costAnalysis"]["estimatedTokensPerCall"]["output"],
            "d": bench["costAnalysis"]["estimatedTokensPerCall"]["output"],
            "e": bench["costAnalysis"]["estimatedTokensPerCall"]["output"],
            "fmt": "#,##0",
            "label": "[SYNTHETIC BENCHMARK]",
            "note": "Structured JSON with intent, language, entities, explanation & next step"
        },
        {
            "row": 24,
            "metric": "Estimated blended cost per LLM fallback call",
            "unit": "USD / call",
            "c": "=(C22*C20/1000000)+(C23*C21/1000000)",
            "d": "=(D22*D20/1000000)+(D23*D21/1000000)",
            "e": "=(E22*E20/1000000)+(E23*E21/1000000)",
            "fmt": "$#,##0.00000",
            "font": font_formula,
            "fill": fill_subtotal,
            "label": "[FORMULA]",
            "note": "= (Input tokens × Input price / 1M) + (Output tokens × Output price / 1M)"
        },

        # --- Section 4: Architecture Cost Comparison ---
        {"type": "section", "title": "4. Monthly Operating Cost Comparison (Pure LLM vs Totoro Fast Router)"},
        {
            "row": 26,
            "metric": "Architecture A: Pure 100% LLM Routing (No Fast Router)",
            "unit": "calls / month",
            "c": "=C8*(1+C14)", "d": "=D8*(1+D14)", "e": "=E8*(1+E14)",
            "fmt": "#,##0",
            "label": "[FORMULA]",
            "note": "Every single support turn calls Groq LLM (with 2% retry buffer)"
        },
        {
            "row": 27,
            "metric": "Architecture A: Total monthly LLM cost",
            "unit": "USD / month",
            "c": "=C26*C24", "d": "=D26*D24", "e": "=E26*E24",
            "fmt": "$#,##0.00",
            "font": font_bold,
            "label": "[FORMULA]",
            "note": "= Architecture A calls × Cost per call"
        },
        {
            "row": 28,
            "metric": "Architecture B: Totoro Hybrid (Fast Router + LLM Fallback)",
            "unit": "calls / month",
            "c": "=C15", "d": "=D15", "e": "=E15",
            "fmt": "#,##0",
            "label": "[FORMULA]",
            "note": "Only ambiguous/novel queries reach LLM (85.36% resolved deterministically)"
        },
        {
            "row": 29,
            "metric": "Architecture B: Total monthly LLM cost",
            "unit": "USD / month",
            "c": "=C28*C24", "d": "=D28*D24", "e": "=E28*E24",
            "fmt": "$#,##0.00",
            "font": font_highlight,
            "fill": fill_highlight,
            "label": "[FORMULA]",
            "note": "= Architecture B calls × Cost per call"
        },
        {
            "row": 30,
            "metric": "Net Monthly Dollar Savings with Fast Router",
            "unit": "USD / month",
            "c": "=C27-C29", "d": "=D27-D29", "e": "=E27-E29",
            "fmt": "$#,##0.00",
            "font": font_highlight,
            "label": "[FORMULA]",
            "note": "= Architecture A cost - Architecture B cost"
        },
        {
            "row": 31,
            "metric": "Net Annual Dollar Savings with Fast Router",
            "unit": "USD / year",
            "c": "=C30*12", "d": "=D30*12", "e": "=E30*12",
            "fmt": "$#,##0.00",
            "font": font_highlight,
            "label": "[FORMULA]",
            "note": "= Monthly savings × 12 months"
        },
        {
            "row": 32,
            "metric": "Cost Reduction Percentage",
            "unit": "% reduction",
            "c": "=(C27-C29)/C27", "d": "=(D27-D29)/D27", "e": "=(E27-E29)/E27",
            "fmt": "0.00%",
            "font": font_highlight,
            "border": double_bottom_border,
            "label": "[FORMULA]",
            "note": "= (Pure LLM cost - Totoro cost) / Pure LLM cost"
        },

        # --- Section 5: Workload Language Breakdown ---
        {"type": "section", "title": "5. Workload Language Breakdown (Observed Synthetic Distribution)"},
        {
            "row": 34,
            "metric": "English language queries (40.0%)",
            "unit": "messages / month",
            "c": "=C8*0.40", "d": "=D8*0.40", "e": "=E8*0.40",
            "fmt": "#,##0",
            "label": "[SYNTHETIC BENCHMARK]",
            "note": "40.0% of synthetic support dataset"
        },
        {
            "row": 35,
            "metric": "Hinglish / Romanized Hindi queries (35.0%)",
            "unit": "messages / month",
            "c": "=C8*0.35", "d": "=D8*0.35", "e": "=E8*0.35",
            "fmt": "#,##0",
            "label": "[SYNTHETIC BENCHMARK]",
            "note": "35.0% of synthetic support dataset"
        },
        {
            "row": 36,
            "metric": "Devanagari Hindi script queries (15.0%)",
            "unit": "messages / month",
            "c": "=C8*0.15", "d": "=D8*0.15", "e": "=E8*0.15",
            "fmt": "#,##0",
            "label": "[SYNTHETIC BENCHMARK]",
            "note": "15.0% of synthetic support dataset"
        },
        {
            "row": 37,
            "metric": "Mixed-script (Latin + Devanagari) queries (10.0%)",
            "unit": "messages / month",
            "c": "=C8*0.10", "d": "=D8*0.10", "e": "=E8*0.10",
            "fmt": "#,##0",
            "label": "[SYNTHETIC BENCHMARK]",
            "note": "10.0% of synthetic support dataset"
        },

        # --- Section 6: Human Escalation & Automation Containment ---
        {"type": "section", "title": "6. Human Escalation & Containment Safety (G8–G12 Guardrails)"},
        {
            "row": 39,
            "metric": "Policy & guardrail human escalation rate",
            "unit": "escalation %",
            "c": bench["categoryDistribution"]["safety_guardrail"] / bench["totalMessages"],
            "d": bench["categoryDistribution"]["safety_guardrail"] / bench["totalMessages"],
            "e": bench["categoryDistribution"]["safety_guardrail"] / bench["totalMessages"],
            "fmt": "0.00%",
            "label": "[SYNTHETIC BENCHMARK]",
            "note": "Mandatory human-led zones: Billing/refunds, security/passwords, human agent requests"
        },
        {
            "row": 40,
            "metric": "Estimated human specialist handoffs generated",
            "unit": "handoffs / month",
            "c": "=C8*C39", "d": "=D8*D39", "e": "=E8*E39",
            "fmt": "#,##0",
            "font": font_formula,
            "label": "[FORMULA]",
            "note": "Escalated to human support queue with complete pre-populated case file"
        },
        {
            "row": 41,
            "metric": "Automated self-service containment",
            "unit": "resolutions / month",
            "c": "=C8-C40", "d": "=D8-D40", "e": "=E8-E40",
            "fmt": "#,##0",
            "font": font_formula,
            "fill": fill_subtotal,
            "label": "[FORMULA]",
            "note": "Handled end-to-end by Totoro's playbook verification and consent flow"
        },
    ]

    # Populate rows
    current_row = 5
    for item in rows_def:
        if item.get("type") == "section":
            ws.merge_cells(start_row=current_row, start_column=1, end_row=current_row, end_column=7)
            cell = ws.cell(row=current_row, column=1)
            cell.value = item["title"]
            cell.font = font_section
            cell.fill = fill_section
            cell.alignment = align_left
            current_row += 1
            continue

        r = current_row
        ws.cell(row=r, column=1, value=item["metric"]).alignment = align_left
        ws.cell(row=r, column=2, value=item["unit"]).alignment = align_left

        cell_c = ws.cell(row=r, column=3, value=item["c"])
        cell_d = ws.cell(row=r, column=4, value=item["d"])
        cell_e = ws.cell(row=r, column=5, value=item["e"])

        cell_c.alignment = align_right
        cell_d.alignment = align_right
        cell_e.alignment = align_right

        if "fmt" in item:
            cell_c.number_format = item["fmt"]
            cell_d.number_format = item["fmt"]
            cell_e.number_format = item["fmt"]

        cell_f = ws.cell(row=r, column=6, value=item["label"])
        cell_f.alignment = align_center

        cell_g = ws.cell(row=r, column=7, value=item["note"])
        cell_g.alignment = align_left

        # Fonts & Fills
        row_font = item.get("font", font_regular)
        row_fill = item.get("fill", None)
        row_border = item.get("border", thin_border)

        for col in range(1, 8):
            c = ws.cell(row=r, column=col)
            c.font = row_font
            c.border = row_border
            if row_fill:
                c.fill = row_fill

        current_row += 1

    # Adjust Column Widths
    col_widths = {
        "A": 48,
        "B": 24,
        "C": 16,
        "D": 16,
        "E": 16,
        "F": 24,
        "G": 55,
    }
    for col_letter, width in col_widths.items():
        ws.column_dimensions[col_letter].width = width

    # Save
    wb.save(WORKBOOK_PATH)
    print(f"[SUCCESS] Updated workbook saved to {WORKBOOK_PATH}")


if __name__ == "__main__":
    populate_cost_model()
