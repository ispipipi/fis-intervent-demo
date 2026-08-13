"""Create polished, fictional document fixtures for the Intervent Preclaim demo."""

from pathlib import Path
from textwrap import shorten

from reportlab.graphics.shapes import Drawing, Line, Rect, String
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    HRFlowable,
    KeepTogether,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "test-fixtures" / "cases"
PAGE_WIDTH, PAGE_HEIGHT = A4

NAVY = colors.HexColor("#1D3150")
NAVY_LIGHT = colors.HexColor("#2C4570")
TEAL = colors.HexColor("#187D80")
TEAL_LIGHT = colors.HexColor("#E7F4F3")
CANVAS = colors.HexColor("#EAF3FF")
LINE = colors.HexColor("#DCE7F5")
LINE_SOFT = colors.HexColor("#EDF3FB")
BODY = colors.HexColor("#41526C")
MUTED = colors.HexColor("#687991")
FAINT = colors.HexColor("#8C9BB1")
WARNING = colors.HexColor("#FFF3D9")
WARNING_TEXT = colors.HexColor("#9A6700")
DANGER = colors.HexColor("#FDE9E7")
DANGER_TEXT = colors.HexColor("#A73535")
SUCCESS = colors.HexColor("#E5F6EC")
SUCCESS_TEXT = colors.HexColor("#26754E")
WHITE = colors.white


CASES = [
    {
        "id": "PRE-FIS-WAN-2025-03-4029",
        "cs": "CS-2025-02892",
        "handler": "Emely Lambraño",
        "assured": "Exportadora Andes Fresh",
        "opponent": "Wan Hai",
        "vessel": "YM EXPRESS",
        "voyage": "086W",
        "origin": "Valparaíso, Chile",
        "destination": "Busan, Korea",
        "discharge": "2025-08-27",
        "jurisdiction": "Reglas de La Haya",
        "cargo": "Uva de mesa Red Globe",
        "containers": "4",
        "packages": "960",
        "net_weight": "76,800 kg",
        "invoice_value": "USD 73,428.00",
        "weight": "84,000 kg",
        "amount": "USD 68,928.00",
        "cause": "Desviación térmica durante el transporte marítimo",
        "container": "WHAU 483920-7",
        "seal": "FSI-086W-88421",
        "temperature": "7.4 C",
        "range": "-0.5 C a 1.0 C",
        "claim_code": "FIS-WAN-TEMP-25",
    },
    {
        "id": "PRE-FIS-HLC-2025-02-4031",
        "cs": "CS-2025-03110",
        "handler": "Camila Rojas",
        "assured": "Frutera Pacífico",
        "opponent": "Hapag-Lloyd",
        "vessel": "RIO GRANDE",
        "voyage": "044E",
        "origin": "San Antonio, Chile",
        "destination": "Valparaíso, Chile",
        "discharge": "2024-11-15",
        "jurisdiction": "Reglas de Hamburgo",
        "cargo": "Arándano fresco calibre 18",
        "containers": "2",
        "packages": "480",
        "net_weight": "34,560 kg",
        "invoice_value": "USD 45,250.00",
        "weight": "38,400 kg",
        "amount": "USD 41,100.00",
        "cause": "Daño mecánico y manipulación en terminal",
        "container": "HLBU 217640-3",
        "seal": "PAC-044E-70128",
        "temperature": "1.8 C",
        "range": "0.0 C a 2.0 C",
        "claim_code": "FIS-HLC-HAND-25",
    },
    {
        "id": "PRE-FIS-MSC-2025-07-4042",
        "cs": "CS-2025-04420",
        "handler": "Emely Lambraño",
        "assured": "Agroexport Norte",
        "opponent": "MSC",
        "vessel": "MSC SOFIA",
        "voyage": "119A",
        "origin": "San Vicente, Chile",
        "destination": "Rotterdam, Netherlands",
        "discharge": "2025-10-26",
        "jurisdiction": "Reglas de La Haya",
        "cargo": "Manzana Royal Gala",
        "containers": "3",
        "packages": "720",
        "net_weight": "51,840 kg",
        "invoice_value": "USD 34,800.00",
        "weight": "57,600 kg",
        "amount": "USD 22,450.00",
        "cause": "Desviación térmica y pérdida de condición comercial",
        "container": "MSCU 705184-2",
        "seal": "AGN-119A-44220",
        "temperature": "4.6 C",
        "range": "0.0 C a 2.0 C",
        "claim_code": "FIS-MSC-TEMP-25",
    },
]

DOCUMENTS = [
    ("Carta de notificación a la naviera", "Carta_de_notificacion_a_la_naviera"),
    ("AoR", "AoR"),
    ("Carta de subrogación o LoA", "Carta_de_subrogacion_o_LoA"),
    ("BL", "BL"),
    ("Booking", "Booking"),
    ("Factura de exportación", "Factura_de_exportacion"),
    ("DUS", "DUS"),
    ("Packing List", "Packing_List"),
    ("Certificado fitosanitario", "Certificado_fitosanitario"),
    ("Certificado de origen", "Certificado_de_origen"),
    ("Liquidaciones comparativas o informe de mercado", "Liquidaciones_comparativas_o_informe_de_mercado"),
    ("Liquidación por contenedor", "Liquidacion_por_contenedor"),
    ("Tracking (naviera)", "Tracking_naviera"),
    ("Informes de QC en origen y destino", "Informes_de_QC_en_origen_y_destino"),
    ("Reportes de inspección", "Reportes_de_inspeccion"),
    ("Certificado de cosecha", "Certificado_de_cosecha"),
    ("Registros de termógrafos", "Registros_de_termografos"),
]

STYLES = getSampleStyleSheet()
STYLES.add(ParagraphStyle(name="DocTitle", parent=STYLES["Title"], fontName="Helvetica-Bold", fontSize=19, leading=23, textColor=NAVY, spaceAfter=5))
STYLES.add(ParagraphStyle(name="DocSubtitle", parent=STYLES["Normal"], fontName="Helvetica", fontSize=9.5, leading=13, textColor=MUTED, spaceAfter=12))
STYLES.add(ParagraphStyle(name="Section", parent=STYLES["Heading2"], fontName="Helvetica-Bold", fontSize=9.5, leading=12, textColor=NAVY, spaceBefore=10, spaceAfter=6, uppercase=True))
STYLES.add(ParagraphStyle(name="Body", parent=STYLES["BodyText"], fontName="Helvetica", fontSize=9, leading=13, textColor=BODY, spaceAfter=7))
STYLES.add(ParagraphStyle(name="Small", parent=STYLES["BodyText"], fontName="Helvetica", fontSize=7.5, leading=10, textColor=MUTED))
STYLES.add(ParagraphStyle(name="Tiny", parent=STYLES["BodyText"], fontName="Helvetica", fontSize=6.5, leading=8.5, textColor=FAINT))
STYLES.add(ParagraphStyle(name="Label", parent=STYLES["BodyText"], fontName="Helvetica-Bold", fontSize=7, leading=9, textColor=MUTED, spaceAfter=2))
STYLES.add(ParagraphStyle(name="Value", parent=STYLES["BodyText"], fontName="Helvetica", fontSize=8.5, leading=11, textColor=NAVY))
STYLES.add(ParagraphStyle(name="TableHead", parent=STYLES["BodyText"], fontName="Helvetica-Bold", fontSize=7, leading=9, textColor=WHITE))
STYLES.add(ParagraphStyle(name="TableCell", parent=STYLES["BodyText"], fontName="Helvetica", fontSize=7.5, leading=10, textColor=BODY))
STYLES.add(ParagraphStyle(name="TableCellBold", parent=STYLES["BodyText"], fontName="Helvetica-Bold", fontSize=7.5, leading=10, textColor=NAVY))
STYLES.add(ParagraphStyle(name="RightValue", parent=STYLES["BodyText"], fontName="Helvetica-Bold", fontSize=9, leading=11, textColor=NAVY, alignment=TA_RIGHT))
STYLES.add(ParagraphStyle(name="CenterValue", parent=STYLES["BodyText"], fontName="Helvetica-Bold", fontSize=10, leading=12, textColor=NAVY, alignment=TA_CENTER))
STYLES.add(ParagraphStyle(name="Signature", parent=STYLES["BodyText"], fontName="Helvetica", fontSize=8, leading=11, textColor=BODY, alignment=TA_CENTER))


def para(text, style="Body"):
    return Paragraph(str(text).replace("&", "&amp;"), STYLES[style])


def destination_country(case):
    return case["destination"].rsplit(", ", 1)[-1]


def destination_city(case):
    return case["destination"].split(", ", 1)[0]


def label_value(label, value):
    return [para(label.upper(), "Label"), para(value, "Value")]


def meta_table(case, extra=None, include_base=True):
    entries = []
    if include_base:
        entries.extend([
            ("Reference No", case["id"]),
            ("CS Claim No", case["cs"]),
            ("Asegurado", case["assured"]),
            ("Contraparte", case["opponent"]),
            ("Nave / viaje", f'{case["vessel"]} / {case["voyage"]}'),
            ("Descarga", f'{case["destination"]} / {case["discharge"]}'),
        ])
    if extra:
        entries.extend(extra)
    data = []
    for index in range(0, len(entries), 2):
        left = entries[index]
        right = entries[index + 1] if index + 1 < len(entries) else ("", "")
        data.append([label_value(*left), label_value(*right)])
    table = Table(data, colWidths=[82 * mm, 82 * mm], hAlign="LEFT")
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#F7FBFF")),
        ("BOX", (0, 0), (-1, -1), 0.6, LINE),
        ("INNERGRID", (0, 0), (-1, -1), 0.4, LINE_SOFT),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 9),
        ("RIGHTPADDING", (0, 0), (-1, -1), 9),
        ("TOPPADDING", (0, 0), (-1, -1), 7),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
    ]))
    return table


def data_table(headers, rows, widths=None, head_color=NAVY):
    table_data = [[para(header, "TableHead") for header in headers]]
    for row in rows:
        table_data.append([para(cell, "TableCell") for cell in row])
    table = Table(table_data, colWidths=widths, repeatRows=1, hAlign="LEFT")
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), head_color),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [WHITE, colors.HexColor("#F7FBFF")]),
        ("GRID", (0, 0), (-1, -1), 0.35, LINE),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 7),
        ("RIGHTPADDING", (0, 0), (-1, -1), 7),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    return table


def section(title):
    return [Spacer(1, 3), para(title, "Section"), HRFlowable(width="100%", thickness=0.7, color=LINE, spaceAfter=7)]


def badge(text, bg=TEAL_LIGHT, fg=TEAL):
    table = Table([[para(text.upper(), "Tiny")]], colWidths=[42 * mm], hAlign="LEFT")
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), bg),
        ("TEXTCOLOR", (0, 0), (-1, -1), fg),
        ("BOX", (0, 0), (-1, -1), 0.5, fg),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    return table


def signature_row(left_name, right_name):
    table = Table([
        [para("____________________________", "Signature"), para("____________________________", "Signature")],
        [para(left_name, "Signature"), para(right_name, "Signature")],
        [para("Firma autorizada", "Tiny"), para("Firma autorizada", "Tiny")],
    ], colWidths=[82 * mm, 82 * mm], hAlign="LEFT")
    table.setStyle(TableStyle([
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING", (0, 0), (-1, -1), 2),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
    ]))
    return table


def chart(title, values, labels, color=TEAL):
    drawing = Drawing(480, 165)
    drawing.add(String(0, 150, title, fontName="Helvetica-Bold", fontSize=8, fillColor=NAVY))
    x0, y0, width, height = 38, 28, 418, 104
    drawing.add(Rect(x0, y0, width, height, strokeColor=LINE, fillColor=colors.HexColor("#FBFDFF"), strokeWidth=0.6))
    max_value = max(values) or 1
    points = []
    for idx, value in enumerate(values):
        x = x0 + idx * width / max(1, len(values) - 1)
        y = y0 + (value / max_value) * (height - 15) + 7
        points.append((x, y))
        drawing.add(Line(x, y0, x, y0 - 4, strokeColor=LINE, strokeWidth=0.5))
        drawing.add(String(x - 12, 11, labels[idx], fontName="Helvetica", fontSize=6, fillColor=MUTED))
    for idx in range(len(points) - 1):
        drawing.add(Line(points[idx][0], points[idx][1], points[idx + 1][0], points[idx + 1][1], strokeColor=color, strokeWidth=2))
    for x, y in points:
        drawing.add(Rect(x - 2.2, y - 2.2, 4.4, 4.4, strokeColor=color, fillColor=WHITE, strokeWidth=1.2))
    drawing.add(String(2, 73, "Nivel", fontName="Helvetica", fontSize=6, fillColor=MUTED))
    return drawing


def title_block(case, doc_type, number):
    return [
        para(doc_type, "DocTitle"),
        para(f'Expediente {case["id"]}  |  Documento {number:02d} de 17  |  Emisión demo 12-08-2026', "DocSubtitle"),
    ]


def common_note(case):
    return Table([[para(f'Este documento forma parte del expediente de demostración {case["id"]}. Los datos son ficticios y se utilizan exclusivamente para probar el flujo de Intervent Preclaim.', "Small")]], colWidths=[164 * mm], style=TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), TEAL_LIGHT),
        ("BOX", (0, 0), (-1, -1), 0.5, TEAL),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 7),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
    ]))


def letter_story(case, doc_type, number):
    story = title_block(case, doc_type, number)
    if doc_type == "Carta de notificación a la naviera":
        story += [badge("BORRADOR DE NOTIFICACION PRECLAIM", WARNING, WARNING_TEXT), Spacer(1, 10)]
        story += [para(f'Sres. {case["opponent"]}', "Body"), para(f'Asunto: Notificación preliminar de reclamo - {case["claim_code"]}', "Body")]
        story += [para(f'Por medio de la presente, {case["assured"]} comunica una situación de daño potencial asociada a la carga de {case["cargo"]}, transportada a bordo de la nave {case["vessel"]}, viaje {case["voyage"]}. La descarga se registró en {case["destination"]} el {case["discharge"]}.', "Body")]
        story += [para('Solicitamos mantener a resguardo todos los antecedentes, documentos, registros de temperatura y evidencias que puedan resultar relevantes para la investigación del evento.', "Body")]
        story += section("Resumen del embarque")
        story += [meta_table(case, [("Monto preliminar", case["amount"]), ("Causa reportada", case["cause"])])]
        story += [Spacer(1, 16), para('La presente comunicación no constituye una admisión de responsabilidad ni un reclamo definitivo. Se emite para preservar derechos y facilitar la investigación conjunta.', "Body"), Spacer(1, 18), signature_row("Intervent Preclaim", case["assured"]), Spacer(1, 18), common_note(case)]
    else:
        title = "Appointment of Representative (AoR)" if doc_type == "AoR" else "Letter of Authority and Subrogation"
        story += [badge("CONTROLLED DOCUMENT", TEAL_LIGHT, TEAL), Spacer(1, 10), para(title, "Section")]
        story += [meta_table(case, [("Principal", case["assured"]), ("Representative", "Intervent Preclaim / FIS Claims Desk"), ("Effective date", "12-08-2026"), ("Scope", "Preclaim assessment and document coordination")], include_base=False)]
        story += section("Authority granted")
        if doc_type == "AoR":
            story += [para(f'The principal appoints Intervent Preclaim as its representative for the purpose of coordinating the preliminary assessment of the shipment identified above, requesting records, organizing supporting documents and communicating factual updates with {case["opponent"]}.', "Body")]
        else:
            story += [para(f'The principal confirms its authority to pursue recovery arising from the reported loss affecting {case["cargo"]}. To the extent permitted by applicable law and the underlying insurance arrangement, the principal authorizes Intervent Preclaim to coordinate subrogation materials and preserve the claim against responsible parties.', "Body")]
        story += [para('This document is a fictional demonstration template. It does not transfer rights, create a mandate or produce legal effect.', "Body")]
        story += section("Case-specific particulars")
        story += [meta_table(case, [("Container", case["container"]), ("Seal", case["seal"])])]
        story += [Spacer(1, 24), signature_row(case["assured"], "Intervent Preclaim"), Spacer(1, 18), common_note(case)]
    return story


def transport_story(case, doc_type, number):
    story = title_block(case, doc_type, number)
    if doc_type == "BL":
        story += [badge("SEA WAYBILL / DEMO COPY", TEAL_LIGHT, TEAL), Spacer(1, 10)]
        story += [meta_table(case, [("Shipper", case["assured"]), ("Consignee", "To order"), ("Port of loading", case["origin"]), ("Port of discharge", case["destination"]), ("Container / seal", f'{case["container"]} / {case["seal"]}'), ("Freight", "Prepaid")])]
        story += section("Cargo manifest")
        story += [data_table(["Marks", "Description", "Packages", "Gross weight", "Temperature"], [["FIS / DEMO", case["cargo"], f'{case["packages"]} cartons', case["weight"], case["range"]], ["TOTAL", "As declared by shipper", case["packages"], case["weight"], "See thermograph"]], [28 * mm, 57 * mm, 25 * mm, 28 * mm, 30 * mm])]
        story += [Spacer(1, 14), para('Freight document prepared as a non-negotiable demonstration copy. Original transport terms are not represented by this fixture.', "Small"), Spacer(1, 16), common_note(case)]
    elif doc_type == "Booking":
        story += [badge("BOOKING CONFIRMATION", TEAL_LIGHT, TEAL), Spacer(1, 10), meta_table(case, [("Booking reference", f'BK-{case["claim_code"]}'), ("Equipment", f'{case["containers"]} x 40RH'), ("Cargo", case["cargo"]), ("Service", "Direct / refrigerated")])]
        story += section("Routing and milestones")
        story += [data_table(["Milestone", "Location", "Planned date", "Status"], [["Gate-in", case["origin"], "2025-08-18", "Confirmed"], ["Vessel departure", case["origin"], "2025-08-21", "Confirmed"], ["Discharge", case["destination"], case["discharge"], "Recorded"], ["Delivery appointment", case["destination"], "2025-08-29", "Pending review"]], [42 * mm, 52 * mm, 35 * mm, 35 * mm])]
        story += section("Handling instructions")
        story += [para(f'Maintain reefer set point within {case["range"]}. Record all door openings, alarms and power interruptions. Any deviation must be notified to the operational contact within 2 hours.', "Body"), common_note(case)]
    else:
        story += [badge("NAVIERA / MOVEMENT RECORD", TEAL_LIGHT, TEAL), Spacer(1, 10), meta_table(case, [("Tracking reference", f'TRK-{case["claim_code"]}'), ("Container", case["container"]), ("Current status", "Delivered - under review")])]
        story += section("Movement history")
        events = [["2025-08-17 14:20", "Empty equipment released", case["origin"], "Completed"], ["2025-08-18 09:15", "Gate-in terminal", case["origin"], "Completed"], ["2025-08-21 22:40", "Loaded on vessel", case["origin"], "Completed"], ["2025-08-27 06:10", "Discharged", case["destination"], "Completed"], ["2025-08-28 11:35", "Customs release", case["destination"], "Completed"], ["2025-08-29 16:10", "Delivery appointment", case["destination"], "Recorded"]]
        story += [data_table(["Timestamp", "Event", "Location", "Status"], events, [33 * mm, 54 * mm, 47 * mm, 30 * mm])]
        story += [Spacer(1, 12), para('Tracking events shown here are representative fixture data and do not connect to a carrier API.', "Small"), common_note(case)]
    return story


def commercial_story(case, doc_type, number):
    story = title_block(case, doc_type, number)
    if doc_type == "Factura de exportación":
        story += [badge("COMMERCIAL INVOICE / DEMO", TEAL_LIGHT, TEAL), Spacer(1, 10), meta_table(case, [("Invoice no", f'INV-{case["claim_code"]}-01'), ("Invoice date", "2025-08-14"), ("Incoterm", "CFR"), ("Currency", "USD")], include_base=False)]
        story += section("Seller and consignee")
        story += [meta_table(case, [("Seller", case["assured"]), ("Consignee", f'{destination_city(case)} Fresh Market Co.'), ("Country of origin", "Chile"), ("Country of destination", destination_country(case))], include_base=False)]
        story += section("Goods and values")
        rows = [["1", case["cargo"], f'{case["packages"]} cartons', case["invoice_value"], case["invoice_value"]], ["", "Packaging and cold chain service", "1 lot", "Included", "Included"]]
        story += [data_table(["Item", "Description", "Quantity", "Unit price", "Amount"], rows, [15 * mm, 55 * mm, 28 * mm, 29 * mm, 37 * mm])]
        totals = Table([[para("Subtotal", "TableCell"), para(case["invoice_value"], "RightValue")], [para("Declared claim exposure", "TableCellBold"), para(case["amount"], "RightValue")]], colWidths=[125 * mm, 39 * mm], hAlign="LEFT")
        totals.setStyle(TableStyle([("BACKGROUND", (0, 1), (-1, 1), TEAL_LIGHT), ("GRID", (0, 0), (-1, -1), 0.35, LINE), ("LEFTPADDING", (0, 0), (-1, -1), 7), ("RIGHTPADDING", (0, 0), (-1, -1), 7), ("TOPPADDING", (0, 0), (-1, -1), 7), ("BOTTOMPADDING", (0, 0), (-1, -1), 7)]))
        story += [Spacer(1, 8), totals, Spacer(1, 14), common_note(case)]
    elif doc_type == "DUS":
        story += [badge("DECLARACION UNICA DE SALIDA / DEMO", TEAL_LIGHT, TEAL), Spacer(1, 10), meta_table(case, [("Declaration no", f'DUS-{case["claim_code"]}-2025'), ("Exporter", case["assured"]), ("Customs office", "Aduana de Valparaíso"), ("Regime", "Exportación definitiva")], include_base=False)]
        story += section("Merchandise declaration")
        story += [data_table(["Line", "HS code", "Description", "Packages", "FOB value"], [["001", "0806.10", case["cargo"], f'{case["packages"]} cartons', case["invoice_value"]], ["002", "3923.21", "Packaging materials", "1 lot", "Included"]], [15 * mm, 25 * mm, 62 * mm, 27 * mm, 35 * mm])]
        story += section("Customs control fields")
        story += [meta_table(case, [("Origin", "Chile"), ("Destination", destination_country(case)), ("Transport mode", "Maritime"), ("Gross weight", case["weight"])])]
        story += [Spacer(1, 15), para('Fixture based on the visual structure of an export declaration. It is not a customs filing and cannot be presented to an authority.', "Small"), common_note(case)]
    elif doc_type == "Packing List":
        story += [badge("PACKING LIST / CONTROLLED COPY", TEAL_LIGHT, TEAL), Spacer(1, 10), meta_table(case, [("Packing list no", f'PL-{case["claim_code"]}-01'), ("Packages", f'{case["packages"]} cartons'), ("Net weight", case["net_weight"]), ("Gross weight", case["weight"])])]
        story += section("Package breakdown")
        container_count = int(case["containers"])
        package_count = int(case["packages"])
        gross_weight = int(case["weight"].replace(",", "").split()[0])
        packages_per_container = package_count // container_count
        weight_per_container = gross_weight // container_count
        rows = [[f'Container {index:02d}', "Cartons", f'{packages_per_container:,} cartons', f'{weight_per_container:,} kg', "40RH"] for index in range(1, container_count + 1)]
        story += [data_table(["Carton range", "Package type", "Pallets", "Gross weight", "Equipment"], rows, [32 * mm, 33 * mm, 28 * mm, 34 * mm, 32 * mm])]
        story += section("Identification")
        story += [para(f'All packages are marked with the shipper reference, crop, variety, lot and cold chain instructions. Container: {case["container"]}. Seal: {case["seal"]}.', "Body"), common_note(case)]
    else:
        story += [badge("SETTLEMENT ANALYSIS / DEMO", TEAL_LIGHT, TEAL), Spacer(1, 10), meta_table(case, [("Settlement reference", f'SET-{case["claim_code"]}'), ("Currency", "USD"), ("Analysis basis", "Comparative market and actual settlement")])]
        story += section("Comparative values")
        story += [data_table(["Method", "Reference value", "Actual settlement", "Difference"], [["Comparable shipment", "USD 45,250.00", "USD 31,800.00", "USD 13,450.00"], ["Market report", "USD 42,100.00", "USD 31,800.00", "USD 10,300.00"], ["Export invoice vs destination sale", "USD 44,100.00", "USD 32,200.00", "USD 11,900.00"]], [50 * mm, 36 * mm, 36 * mm, 40 * mm])]
        story += section("Selected basis")
        story += [para('For this demonstration, Method 1 is selected because it provides the strongest like-for-like comparison in the same commercial window. Additional salvage adjustment: -USD 1,400.00. Indicative final claim: USD 12,050.00.', "Body"), common_note(case)]
    return story


def certificate_story(case, doc_type, number):
    story = title_block(case, doc_type, number)
    if doc_type == "Certificado fitosanitario":
        story += [badge("PHYTOSANITARY CERTIFICATE / DEMO", SUCCESS, SUCCESS_TEXT), Spacer(1, 10), meta_table(case, [("Certificate no", f'PHY-{case["claim_code"]}-2025'), ("Exporter", case["assured"]), ("Consignment", case["cargo"]), ("Quantity", case["weight"]), ("Country of origin", "Chile"), ("Country of destination", destination_country(case))])]
        story += section("Declaration")
        story += [para('The consignment described above has been inspected in accordance with the representative fixture protocol and is declared free from the listed quarantine pests for demonstration purposes.', "Body")]
        story += section("Treatment and inspection")
        story += [data_table(["Control", "Result", "Date", "Officer"], [["Visual inspection", "No visible pest evidence", "2025-08-14", "Control desk"], ["Cold chain review", "Records attached", "2025-08-14", "Quality desk"], ["Packaging review", "Compliant fixture", "2025-08-14", "Export desk"]], [42 * mm, 61 * mm, 29 * mm, 32 * mm]), Spacer(1, 14), signature_row("Authorized officer", case["assured"]), common_note(case)]
    elif doc_type == "Certificado de origen":
        story += [badge("CERTIFICATE OF ORIGIN / DEMO", SUCCESS, SUCCESS_TEXT), Spacer(1, 10), meta_table(case, [("Certificate no", f'COO-{case["claim_code"]}-2025'), ("Exporter", case["assured"]), ("Origin", "Chile"), ("Destination", case["destination"]), ("Transport", f'{case["vessel"]} / {case["voyage"]}')])]
        story += section("Goods originating in Chile")
        story += [data_table(["Item", "Description", "Packages", "Net weight", "Origin criterion"], [["1", case["cargo"], f'{case["packages"]} cartons', case["net_weight"], "Wholly obtained"], ["2", "Packaging materials", "1 lot", "7,200 kg", "Produced in Chile"]], [17 * mm, 57 * mm, 29 * mm, 30 * mm, 31 * mm])]
        story += [Spacer(1, 17), para('The issuing party certifies, for demonstration purposes, that the goods listed have Chilean origin according to the stated fixture information.', "Body"), signature_row("Issuing office", case["assured"]), common_note(case)]
    elif doc_type == "Certificado de cosecha":
        story += [badge("HARVEST CERTIFICATE / DEMO", SUCCESS, SUCCESS_TEXT), Spacer(1, 10), meta_table(case, [("Certificate no", f'HARV-{case["claim_code"]}'), ("Producer", case["assured"]), ("Product", case["cargo"]), ("Season", "2025"), ("Farm lot", "AGF-VAL-25-118")])]
        story += section("Harvest details")
        story += [data_table(["Field / lot", "Harvest window", "Quantity", "Condition at harvest"], [["AGF-VAL-25-118", "2025-08-04 to 2025-08-11", case["weight"], "Fresh / export grade"], ["AGF-VAL-25-119", "2025-08-05 to 2025-08-12", "12,800 kg", "Fresh / export grade"]], [37 * mm, 46 * mm, 35 * mm, 46 * mm])]
        story += [Spacer(1, 14), para('This certificate records representative harvest information for the demo shipment and is not an agricultural authority certificate.', "Body"), signature_row("Field supervisor", case["assured"]), common_note(case)]
    else:
        story += [badge("QUALITY REPORT / DEMO", SUCCESS, SUCCESS_TEXT), Spacer(1, 10), meta_table(case, [("Report no", f'QC-{case["claim_code"]}'), ("Inspection points", "Origin and destination"), ("Product", case["cargo"]), ("Lot", "AGF-QC-25-118")])]
        story += section("Quality indicators")
        rows = [["Temperature on receipt", case["temperature"], case["range"], "Outside target" if "WAN" in case["id"] else "Within target"], ["Appearance", "Minor pressure marks", "Export grade", "Review"], ["Firmness", "Acceptable / variable", "Commercial spec", "Review"], ["Decay", "1.8% sample", "Max 2.0%", "Within tolerance"]]
        story += [data_table(["Indicator", "Observed", "Reference", "Assessment"], rows, [43 * mm, 43 * mm, 42 * mm, 36 * mm])]
        story += section("Conclusion")
        story += [para(f'The quality observations are consistent with the preliminary cause recorded in the case: {case["cause"]}. Photographs and sampling sheets are represented by metadata in the digital case file.', "Body"), signature_row("QC origin desk", "QC destination desk"), common_note(case)]
    return story


def analysis_story(case, doc_type, number):
    story = title_block(case, doc_type, number)
    if doc_type == "Liquidaciones comparativas o informe de mercado":
        story += [badge("MARKET COMPARISON REPORT / DEMO", TEAL_LIGHT, TEAL), Spacer(1, 10), meta_table(case, [("Report no", f'MKT-{case["claim_code"]}'), ("Market window", "2025-08-20 to 2025-09-05"), ("Analyst", "Intervent Preclaim Research"), ("Currency", "USD")], include_base=False)]
        story += section("Comparable transactions")
        story += [data_table(["Reference", "Market", "Grade", "Volume", "Net value"], [["CMP-001", "Busan", "Export grade", "18,000 kg", "USD 2.42/kg"], ["CMP-002", "Incheon", "Export grade", "22,000 kg", "USD 2.36/kg"], ["CMP-003", "Busan", "Mixed grade", "16,500 kg", "USD 2.18/kg"], ["CMP-004", "Seoul", "Export grade", "19,200 kg", "USD 2.31/kg"]], [30 * mm, 32 * mm, 36 * mm, 32 * mm, 34 * mm])]
        story += [Spacer(1, 10), chart("Indicative market value per kg", [2.42, 2.36, 2.18, 2.31], ["CMP-001", "CMP-002", "CMP-003", "CMP-004"], TEAL)]
        story += section("Analyst conclusion")
        story += [para(f'The comparable set supports a preliminary reference value for {case["cargo"]}. Method 1 is considered the most transparent basis for the simulated calculation, subject to human confirmation and document review.', "Body"), common_note(case)]
    elif doc_type == "Reportes de inspección":
        story += [badge("SURVEY REPORT / DEMO", WARNING, WARNING_TEXT), Spacer(1, 10), meta_table(case, [("Survey report no", f'SUR-{case["claim_code"]}'), ("Surveyor", "Global Marine Survey"), ("Inspection date", "2025-09-02"), ("Location", case["destination"])])]
        story += section("Scope and findings")
        story += [para(f'Inspection of the representative shipment of {case["cargo"]} was performed using document review, visual inspection and a sample review of temperature records. The reported cause is: {case["cause"]}.', "Body")]
        story += [data_table(["Finding", "Evidence reviewed", "Severity", "Action"], [["Condition variation", "QC destination report", "Medium", "Preserve samples"], ["Temperature record", "Thermograph metadata", "High" if "WAN" in case["id"] else "Medium", "Compare against BL"], ["Packaging integrity", "Packing list / photos", "Low", "No immediate action"]], [42 * mm, 52 * mm, 28 * mm, 42 * mm])]
        story += section("Photographic record")
        story += [Table([[para("PHOTO A\nRepresentative pallet / container door", "CenterValue"), para("PHOTO B\nRepresentative product condition", "CenterValue")]], colWidths=[82 * mm, 82 * mm], rowHeights=[30 * mm], style=TableStyle([("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#F7FBFF")), ("BOX", (0, 0), (-1, -1), 0.5, LINE), ("INNERGRID", (0, 0), (-1, -1), 0.5, LINE), ("VALIGN", (0, 0), (-1, -1), "MIDDLE"), ("ALIGN", (0, 0), (-1, -1), "CENTER")])), Spacer(1, 12), signature_row("Surveyor", case["assured"]), common_note(case)]
    elif doc_type == "Registros de termógrafos":
        story += [badge("TEMPERATURE LOGGER REPORT / DEMO", DANGER, DANGER_TEXT), Spacer(1, 10), meta_table(case, [("Logger ID", f'LOGGER-{case["container"][-5:]}'), ("Container", case["container"]), ("Set point", case["range"]), ("Sampling", "30 minutes")], include_base=False)]
        story += section("Temperature profile")
        values = [0.2, 0.4, 0.7, 1.1, 2.4, 4.6, 5.8, 7.4, 6.9, 4.5, 2.1, 1.2, 0.8]
        if "HLC" in case["id"]:
            values = [0.4, 0.6, 0.9, 1.2, 1.8, 1.7, 1.6, 1.4, 1.3, 1.1, 1.0, 1.2, 1.4]
        story += [chart("Temperature C over representative journey", values, ["G1", "G2", "G3", "G4", "G5", "G6", "G7", "G8", "G9", "G10", "G11", "G12", "G13"], DANGER_TEXT)]
        story += section("Selected readings")
        story += [data_table(["Reading", "Timestamp", "Temperature", "Condition"], [["R-004", "2025-08-22 08:00", "0.7 C", "Within range"], ["R-008", "2025-08-23 08:00", case["temperature"], "Review required"], ["R-012", "2025-08-24 08:00", "1.2 C", "Within range"], ["R-016", "2025-08-25 08:00", "6.9 C", "Review required"]], [25 * mm, 45 * mm, 34 * mm, 60 * mm]), Spacer(1, 12), para('This report is a visual fixture derived from representative readings. It is not a certified data logger export.', "Small"), common_note(case)]
    else:
        story += [badge("CONTAINER SETTLEMENT / DEMO", TEAL_LIGHT, TEAL), Spacer(1, 10), meta_table(case, [("Settlement no", f'CONT-{case["claim_code"]}'), ("Container", case["container"]), ("Currency", "USD"), ("Responsible", case["handler"])])]
        story += section("Container-level calculation")
        story += [data_table(["Concept", "Amount", "Support", "Treatment"], [["Invoice value", case["invoice_value"], "Commercial invoice", "Base"], ["Actual settlement", case["amount"], "Settlement record", "Reference"], ["Salvage / recovery", "To be confirmed", "Salvage note", "Adjustment"], ["Indicative claim", case["amount"], "Comparative method", "Review"]], [50 * mm, 36 * mm, 46 * mm, 32 * mm])]
        story += [Spacer(1, 14), para('The container settlement is intended to connect the physical unit to the preliminary loss calculation and preserve traceability in the case file.', "Body"), common_note(case)]
    return story


def build_story(case, doc_type, number):
    if doc_type in {"Carta de notificación a la naviera", "AoR", "Carta de subrogación o LoA"}:
        return letter_story(case, doc_type, number)
    if doc_type in {"BL", "Booking", "Tracking (naviera)"}:
        return transport_story(case, doc_type, number)
    if doc_type in {"Factura de exportación", "DUS", "Packing List", "Liquidación por contenedor"}:
        return commercial_story(case, doc_type, number)
    if doc_type in {"Certificado fitosanitario", "Certificado de origen", "Certificado de cosecha", "Informes de QC en origen y destino"}:
        return certificate_story(case, doc_type, number)
    return analysis_story(case, doc_type, number)


def draw_page_chrome(canvas, doc):
    case = doc.case
    doc_type = doc.doc_type
    canvas.saveState()
    canvas.setFillColor(NAVY)
    canvas.rect(0, PAGE_HEIGHT - 22 * mm, PAGE_WIDTH, 22 * mm, fill=1, stroke=0)
    canvas.setFillColor(TEAL)
    canvas.circle(18 * mm, PAGE_HEIGHT - 11 * mm, 5 * mm, fill=1, stroke=0)
    canvas.setFillColor(WHITE)
    canvas.setFont("Helvetica-Bold", 8.5)
    canvas.drawString(29 * mm, PAGE_HEIGHT - 10 * mm, "FRUIT INSURANCE SERVICES")
    canvas.setFont("Helvetica", 6.5)
    canvas.drawString(29 * mm, PAGE_HEIGHT - 15 * mm, "Claims coordination and preclaim review")
    canvas.setFont("Helvetica-Bold", 7)
    canvas.drawRightString(PAGE_WIDTH - 15 * mm, PAGE_HEIGHT - 10 * mm, "INTERVENT PRECLAIM")
    canvas.setFont("Helvetica", 6.5)
    canvas.drawRightString(PAGE_WIDTH - 15 * mm, PAGE_HEIGHT - 15 * mm, "CONTROLLED DEMO COPY")
    canvas.setFillColor(DANGER)
    canvas.roundRect(PAGE_WIDTH - 67 * mm, PAGE_HEIGHT - 31 * mm, 52 * mm, 5 * mm, 2 * mm, fill=1, stroke=0)
    canvas.setFillColor(DANGER_TEXT)
    canvas.setFont("Helvetica-Bold", 5.8)
    canvas.drawCentredString(PAGE_WIDTH - 41 * mm, PAGE_HEIGHT - 29.4 * mm, "DOCUMENTO DE DEMOSTRACION - SIN VALIDEZ LEGAL")
    canvas.setStrokeColor(LINE)
    canvas.setLineWidth(0.6)
    canvas.line(15 * mm, 16 * mm, PAGE_WIDTH - 15 * mm, 16 * mm)
    canvas.setFillColor(MUTED)
    canvas.setFont("Helvetica", 6.5)
    canvas.drawString(15 * mm, 10 * mm, f'{case["id"]} | {doc_type}')
    canvas.drawRightString(PAGE_WIDTH - 15 * mm, 10 * mm, f"Página {canvas.getPageNumber()}")
    canvas.restoreState()


def create_pdf(case, doc_type, number, target):
    doc = SimpleDocTemplate(str(target), pagesize=A4, rightMargin=15 * mm, leftMargin=15 * mm, topMargin=32 * mm, bottomMargin=23 * mm, title=doc_type, author="Intervent Preclaim Demo")
    doc.case = case
    doc.doc_type = doc_type
    doc.build(build_story(case, doc_type, number), onFirstPage=draw_page_chrome, onLaterPages=draw_page_chrome)


def write_readme():
    readme = OUTPUT.parent / "README.md"
    readme.write_text(
        """# Expedientes de prueba Intervent Preclaim

Se incluyen tres expedientes ficticios, cada uno con los 17 documentos requeridos por el checklist del demo.

Todos los PDFs tienen diseño editorial, datos consistentes por caso y una marca visible de `DOCUMENTO DE DEMOSTRACION - SIN VALIDEZ LEGAL`. No deben utilizarse para trámites reales.

## Casos

- `PRE-FIS-WAN-2025-03-4029`: Exportadora Andes Fresh / Wan Hai.
- `PRE-FIS-HLC-2025-02-4031`: Frutera Pacífico / Hapag-Lloyd.
- `PRE-FIS-MSC-2025-07-4042`: Agroexport Norte / MSC.

## Uso en la demo

1. Entra como Handler y abre uno de los casos.
2. En la pestaña Documentos selecciona los PDFs de la carpeta del caso.
3. Corrige la clasificación sugerida si algún archivo queda como Sin clasificar.
4. Confirma la carga y revisa el checklist 17/17.
""",
        encoding="utf-8",
    )


def main():
    OUTPUT.mkdir(parents=True, exist_ok=True)
    write_readme()
    count = 0
    for case in CASES:
        case_dir = OUTPUT / case["id"]
        case_dir.mkdir(parents=True, exist_ok=True)
        for number, (doc_type, slug) in enumerate(DOCUMENTS, start=1):
            target = case_dir / f'{case["id"]}_{slug}.pdf'
            create_pdf(case, doc_type, number, target)
            count += 1
    print(f"Generated {count} PDFs in {OUTPUT}")


if __name__ == "__main__":
    main()
