import pandas as pd
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
import io

def generate_excel_report(expenses: list):
    df = pd.DataFrame(expenses)
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df.to_excel(writer, index=False, sheet_name='Expenses')
    output.seek(0)
    return output

def generate_pdf_report(expenses: list):
    output = io.BytesIO()
    c = canvas.Canvas(output, pagesize=letter)
    width, height = letter
    
    c.setFont("Helvetica-Bold", 16)
    c.drawString(50, height - 50, "Expense Report")
    
    c.setFont("Helvetica", 10)
    y = height - 80
    
    # Headers
    headers = ["Date", "Type", "Category", "Amount", "Description"]
    x_positions = [50, 120, 180, 260, 320]
    
    for i, h in enumerate(headers):
        c.drawString(x_positions[i], y, h)
    
    y -= 20
    c.line(50, y + 15, 550, y + 15)
    
    for exp in expenses:
        if y < 50:
            c.showPage()
            y = height - 50
            c.setFont("Helvetica", 10)
        
        c.drawString(50, y, str(exp['Date']))
        c.drawString(120, y, str(exp['Type']))
        c.drawString(180, y, str(exp['Category']))
        c.drawString(260, y, f"RS {exp['Amount']}")
        c.drawString(320, y, str(exp['Description'])[:40])
        y -= 20
        
    c.save()
    output.seek(0)
    return output
