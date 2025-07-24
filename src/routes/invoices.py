from flask import Blueprint, request, jsonify, make_response
from flask_login import login_required
from src.models.sale import Sale
from src.models.store import Store
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.enums import TA_CENTER, TA_RIGHT, TA_LEFT
from io import BytesIO
import os
from datetime import datetime

invoices_bp = Blueprint('invoices', __name__)

@invoices_bp.route('/sales/<int:sale_id>/invoice', methods=['GET'])
@login_required
def generate_invoice(sale_id):
    """Generate a professional invoice PDF for a sale"""
    try:
        sale = Sale.query.get_or_404(sale_id)
        
        # Create PDF buffer
        buffer = BytesIO()
        
        # Create PDF document
        doc = SimpleDocTemplate(
            buffer,
            pagesize=letter,
            rightMargin=72,
            leftMargin=72,
            topMargin=72,
            bottomMargin=18
        )
        
        # Container for the 'Flowable' objects
        elements = []
        
        # Define styles
        styles = getSampleStyleSheet()
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=24,
            spaceAfter=30,
            alignment=TA_CENTER,
            textColor=colors.HexColor('#2c3e50')
        )
        
        heading_style = ParagraphStyle(
            'CustomHeading',
            parent=styles['Heading2'],
            fontSize=14,
            spaceAfter=12,
            textColor=colors.HexColor('#34495e')
        )
        
        normal_style = ParagraphStyle(
            'CustomNormal',
            parent=styles['Normal'],
            fontSize=10,
            spaceAfter=6
        )
        
        # Company header
        elements.append(Paragraph("SUPPLEMENT SHOP", title_style))
        elements.append(Paragraph("Inventory Management System", styles['Normal']))
        elements.append(Spacer(1, 20))
        
        # Invoice header
        invoice_header = [
            ['INVOICE', ''],
            [f'Invoice Number: {sale.invoice_number}', ''],
            [f'Date: {sale.sale_date.strftime("%B %d, %Y")}', ''],
            [f'Store: {sale.store.name if sale.store else "Unknown"}', '']
        ]
        
        if sale.customer_name:
            invoice_header.extend([
                ['', ''],
                ['Bill To:', ''],
                [f'{sale.customer_name}', ''],
            ])
            if sale.customer_phone:
                invoice_header.append([f'Phone: {sale.customer_phone}', ''])
            if sale.customer_email:
                invoice_header.append([f'Email: {sale.customer_email}', ''])
        
        header_table = Table(invoice_header, colWidths=[3*inch, 3*inch])
        header_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (0, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (0, 0), 16),
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 1), (-1, -1), 10),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ]))
        
        elements.append(header_table)
        elements.append(Spacer(1, 30))
        
        # Items table
        items_data = [['Item', 'SKU', 'Qty', 'Unit Price', 'Total']]
        
        for item in sale.sale_items:
            flavor_info = f" - {item.product_flavor.flavor.name}" if item.product_flavor else ""
            product_name = f"{item.product.name}{flavor_info}" if item.product else "Unknown Product"
            sku = item.product.sku if item.product else "N/A"
            
            items_data.append([
                product_name,
                sku,
                str(item.quantity),
                f"${item.unit_price:.2f}",
                f"${item.line_total:.2f}"
            ])
        
        items_table = Table(items_data, colWidths=[2.5*inch, 1*inch, 0.7*inch, 1*inch, 1*inch])
        items_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#34495e')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('ALIGN', (0, 1), (0, -1), 'LEFT'),  # Product names left-aligned
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 12),
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 1), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ]))
        
        elements.append(items_table)
        elements.append(Spacer(1, 20))
        
        # Totals table
        totals_data = [
            ['Subtotal:', f"${sale.subtotal:.2f}"],
            ['Tax:', f"${sale.tax_amount:.2f}"],
            ['Discount:', f"-${sale.discount_amount:.2f}"],
            ['TOTAL:', f"${sale.total_amount:.2f}"]
        ]
        
        totals_table = Table(totals_data, colWidths=[4*inch, 1.5*inch])
        totals_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'RIGHT'),
            ('FONTNAME', (0, 0), (-1, -2), 'Helvetica'),
            ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -2), 10),
            ('FONTSIZE', (0, -1), (-1, -1), 12),
            ('BACKGROUND', (0, -1), (-1, -1), colors.HexColor('#ecf0f1')),
            ('LINEBELOW', (0, -2), (-1, -2), 1, colors.black),
            ('LINEBELOW', (0, -1), (-1, -1), 2, colors.black),
        ]))
        
        elements.append(totals_table)
        elements.append(Spacer(1, 30))
        
        # Payment information
        payment_info = f"Payment Method: {sale.payment_method.title()}"
        payment_status = f"Payment Status: {sale.payment_status.title()}"
        
        elements.append(Paragraph(payment_info, normal_style))
        elements.append(Paragraph(payment_status, normal_style))
        
        if sale.notes:
            elements.append(Spacer(1, 20))
            elements.append(Paragraph("Notes:", heading_style))
            elements.append(Paragraph(sale.notes, normal_style))
        
        # Footer
        elements.append(Spacer(1, 30))
        footer_text = "Thank you for your business!"
        elements.append(Paragraph(footer_text, ParagraphStyle(
            'Footer',
            parent=styles['Normal'],
            fontSize=12,
            alignment=TA_CENTER,
            textColor=colors.HexColor('#7f8c8d')
        )))
        
        # Build PDF
        doc.build(elements)
        
        # Get PDF data
        pdf_data = buffer.getvalue()
        buffer.close()
        
        # Create response
        response = make_response(pdf_data)
        response.headers['Content-Type'] = 'application/pdf'
        response.headers['Content-Disposition'] = f'inline; filename=invoice_{sale.invoice_number}.pdf'
        
        return response
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@invoices_bp.route('/sales/<int:sale_id>/receipt', methods=['GET'])
@login_required
def generate_receipt(sale_id):
    """Generate a simple receipt for a sale"""
    try:
        sale = Sale.query.get_or_404(sale_id)
        
        # Create PDF buffer
        buffer = BytesIO()
        
        # Create PDF document (smaller size for receipt)
        doc = SimpleDocTemplate(
            buffer,
            pagesize=(4*inch, 6*inch),  # Receipt size
            rightMargin=0.2*inch,
            leftMargin=0.2*inch,
            topMargin=0.2*inch,
            bottomMargin=0.2*inch
        )
        
        elements = []
        styles = getSampleStyleSheet()
        
        # Receipt styles
        receipt_title = ParagraphStyle(
            'ReceiptTitle',
            parent=styles['Normal'],
            fontSize=14,
            alignment=TA_CENTER,
            fontName='Helvetica-Bold'
        )
        
        receipt_normal = ParagraphStyle(
            'ReceiptNormal',
            parent=styles['Normal'],
            fontSize=8,
            alignment=TA_CENTER
        )
        
        receipt_item = ParagraphStyle(
            'ReceiptItem',
            parent=styles['Normal'],
            fontSize=8,
            alignment=TA_LEFT
        )
        
        # Header
        elements.append(Paragraph("SUPPLEMENT SHOP", receipt_title))
        elements.append(Paragraph(f"{sale.store.name if sale.store else 'Store'}", receipt_normal))
        elements.append(Spacer(1, 10))
        
        # Receipt info
        elements.append(Paragraph(f"Receipt: {sale.invoice_number}", receipt_normal))
        elements.append(Paragraph(f"Date: {sale.sale_date.strftime('%m/%d/%Y %I:%M %p')}", receipt_normal))
        elements.append(Paragraph("=" * 40, receipt_normal))
        elements.append(Spacer(1, 5))
        
        # Items
        for item in sale.sale_items:
            flavor_info = f" - {item.product_flavor.flavor.name}" if item.product_flavor else ""
            product_name = f"{item.product.name}{flavor_info}" if item.product else "Unknown Product"
            
            item_line = f"{product_name}"
            elements.append(Paragraph(item_line, receipt_item))
            
            qty_price_line = f"{item.quantity} x ${item.unit_price:.2f} = ${item.line_total:.2f}"
            elements.append(Paragraph(qty_price_line, ParagraphStyle(
                'ReceiptQtyPrice',
                parent=receipt_item,
                alignment=TA_RIGHT
            )))
            elements.append(Spacer(1, 3))
        
        elements.append(Paragraph("=" * 40, receipt_normal))
        
        # Totals
        elements.append(Paragraph(f"Subtotal: ${sale.subtotal:.2f}", ParagraphStyle(
            'ReceiptTotal',
            parent=receipt_normal,
            alignment=TA_RIGHT
        )))
        
        if sale.tax_amount > 0:
            elements.append(Paragraph(f"Tax: ${sale.tax_amount:.2f}", ParagraphStyle(
                'ReceiptTotal',
                parent=receipt_normal,
                alignment=TA_RIGHT
            )))
        
        if sale.discount_amount > 0:
            elements.append(Paragraph(f"Discount: -${sale.discount_amount:.2f}", ParagraphStyle(
                'ReceiptTotal',
                parent=receipt_normal,
                alignment=TA_RIGHT
            )))
        
        elements.append(Paragraph(f"TOTAL: ${sale.total_amount:.2f}", ParagraphStyle(
            'ReceiptGrandTotal',
            parent=receipt_normal,
            alignment=TA_RIGHT,
            fontName='Helvetica-Bold',
            fontSize=10
        )))
        
        elements.append(Spacer(1, 10))
        elements.append(Paragraph(f"Payment: {sale.payment_method.title()}", receipt_normal))
        elements.append(Spacer(1, 10))
        elements.append(Paragraph("Thank you!", receipt_normal))
        
        # Build PDF
        doc.build(elements)
        
        # Get PDF data
        pdf_data = buffer.getvalue()
        buffer.close()
        
        # Create response
        response = make_response(pdf_data)
        response.headers['Content-Type'] = 'application/pdf'
        response.headers['Content-Disposition'] = f'inline; filename=receipt_{sale.invoice_number}.pdf'
        
        return response
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@invoices_bp.route('/sales/<int:sale_id>/print-receipt', methods=['POST'])
@login_required
def print_receipt(sale_id):
    """Generate a text-based receipt for thermal printers"""
    try:
        sale = Sale.query.get_or_404(sale_id)
        
        # Generate text receipt
        receipt_text = generate_text_receipt(sale)
        
        return jsonify({
            'receipt_text': receipt_text,
            'print_ready': True
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

def generate_text_receipt(sale):
    """Generate a text-based receipt suitable for thermal printers"""
    lines = []
    
    # Header
    lines.append("SUPPLEMENT SHOP")
    lines.append(f"{sale.store.name if sale.store else 'Store'}")
    lines.append("=" * 32)
    lines.append(f"Receipt: {sale.invoice_number}")
    lines.append(f"Date: {sale.sale_date.strftime('%m/%d/%Y %I:%M %p')}")
    lines.append("=" * 32)
    lines.append("")
    
    # Items
    for item in sale.sale_items:
        flavor_info = f" - {item.product_flavor.flavor.name}" if item.product_flavor else ""
        product_name = f"{item.product.name}{flavor_info}" if item.product else "Unknown Product"
        
        # Truncate long product names
        if len(product_name) > 28:
            product_name = product_name[:25] + "..."
        
        lines.append(product_name)
        
        qty_price = f"{item.quantity} x ${item.unit_price:.2f}"
        total = f"${item.line_total:.2f}"
        
        # Right-align the total
        spacing = 32 - len(qty_price) - len(total)
        lines.append(f"{qty_price}{' ' * spacing}{total}")
        lines.append("")
    
    lines.append("=" * 32)
    
    # Totals
    subtotal_line = f"Subtotal:{' ' * (32 - 9 - len(f'${sale.subtotal:.2f}'))}${sale.subtotal:.2f}"
    lines.append(subtotal_line)
    
    if sale.tax_amount > 0:
        tax_line = f"Tax:{' ' * (32 - 4 - len(f'${sale.tax_amount:.2f}'))}${sale.tax_amount:.2f}"
        lines.append(tax_line)
    
    if sale.discount_amount > 0:
        discount_line = f"Discount:{' ' * (32 - 9 - len(f'-${sale.discount_amount:.2f}'))}-${sale.discount_amount:.2f}"
        lines.append(discount_line)
    
    total_line = f"TOTAL:{' ' * (32 - 6 - len(f'${sale.total_amount:.2f}'))}${sale.total_amount:.2f}"
    lines.append(total_line)
    
    lines.append("=" * 32)
    lines.append(f"Payment: {sale.payment_method.title()}")
    lines.append("")
    lines.append("Thank you for your business!")
    lines.append("")
    lines.append("")  # Extra lines for cutting
    
    return "\n".join(lines)

@invoices_bp.route('/grns/<int:grn_id>/document', methods=['GET'])
@login_required
def generate_grn_document(grn_id):
    """Generate a GRN document PDF"""
    try:
        from src.models.grn import GRN
        grn = GRN.query.get_or_404(grn_id)
        
        # Create PDF buffer
        buffer = BytesIO()
        
        # Create PDF document
        doc = SimpleDocTemplate(
            buffer,
            pagesize=letter,
            rightMargin=72,
            leftMargin=72,
            topMargin=72,
            bottomMargin=18
        )
        
        elements = []
        styles = getSampleStyleSheet()
        
        # Title
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=20,
            spaceAfter=30,
            alignment=TA_CENTER,
            textColor=colors.HexColor('#2c3e50')
        )
        
        elements.append(Paragraph("GOODS RECEIVED NOTE", title_style))
        elements.append(Spacer(1, 20))
        
        # GRN header information
        grn_info = [
            ['GRN Number:', grn.grn_number],
            ['Store:', grn.store.name if grn.store else 'Unknown'],
            ['Supplier:', grn.supplier.name if grn.supplier else 'Unknown'],
            ['Received Date:', grn.received_date.strftime('%B %d, %Y')],
            ['Status:', grn.status.title()],
        ]
        
        if grn.purchase_order_number:
            grn_info.append(['PO Number:', grn.purchase_order_number])
        if grn.invoice_number:
            grn_info.append(['Invoice Number:', grn.invoice_number])
        
        info_table = Table(grn_info, colWidths=[2*inch, 4*inch])
        info_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTNAME', (1, 0), (1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ]))
        
        elements.append(info_table)
        elements.append(Spacer(1, 30))
        
        # Items table
        items_data = [['Product', 'Flavor', 'Batch', 'Ordered', 'Received', 'Unit Cost', 'Total']]
        
        for item in grn.grn_items:
            flavor_name = item.product_flavor.flavor.name if item.product_flavor else "N/A"
            
            items_data.append([
                item.product.name if item.product else "Unknown",
                flavor_name,
                item.batch_number or "N/A",
                str(item.quantity_ordered),
                str(item.quantity_received),
                f"${item.unit_cost:.2f}",
                f"${item.line_total:.2f}"
            ])
        
        items_table = Table(items_data, colWidths=[1.5*inch, 0.8*inch, 1*inch, 0.6*inch, 0.6*inch, 0.8*inch, 0.8*inch])
        items_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#34495e')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('ALIGN', (0, 1), (0, -1), 'LEFT'),  # Product names left-aligned
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 10),
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 1), (-1, -1), 9),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ]))
        
        elements.append(items_table)
        elements.append(Spacer(1, 20))
        
        # Total
        total_data = [['TOTAL AMOUNT:', f"${grn.total_amount:.2f}"]]
        total_table = Table(total_data, colWidths=[5*inch, 1.5*inch])
        total_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'RIGHT'),
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 12),
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#ecf0f1')),
            ('LINEBELOW', (0, 0), (-1, -1), 2, colors.black),
        ]))
        
        elements.append(total_table)
        
        if grn.notes:
            elements.append(Spacer(1, 20))
            elements.append(Paragraph("Notes:", styles['Heading3']))
            elements.append(Paragraph(grn.notes, styles['Normal']))
        
        # Signatures
        elements.append(Spacer(1, 40))
        signature_data = [
            ['Received By:', 'Verified By:'],
            ['', ''],
            ['_' * 20, '_' * 20],
            [grn.creator.username if grn.creator else '', grn.verifier.username if grn.verifier else ''],
            [grn.received_date.strftime('%m/%d/%Y'), grn.verified_date.strftime('%m/%d/%Y') if grn.verified_date else '']
        ]
        
        signature_table = Table(signature_data, colWidths=[3*inch, 3*inch])
        signature_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 1), 'Helvetica-Bold'),
            ('FONTNAME', (0, 2), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ]))
        
        elements.append(signature_table)
        
        # Build PDF
        doc.build(elements)
        
        # Get PDF data
        pdf_data = buffer.getvalue()
        buffer.close()
        
        # Create response
        response = make_response(pdf_data)
        response.headers['Content-Type'] = 'application/pdf'
        response.headers['Content-Disposition'] = f'inline; filename=grn_{grn.grn_number}.pdf'
        
        return response
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

