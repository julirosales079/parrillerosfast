import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, MapPin, Phone, CreditCard, Mail, FileText, ArrowLeft, Send, CheckCircle, Clock, Truck, Download, Printer, Receipt, ExternalLink } from 'lucide-react';
import { useOrder } from '../context/OrderContext';
import OrderSummary from './OrderSummary';
import TourButton from './TourButton';
import LocationSelectionPage from '../pages/LocationSelectionPage';
import { Location } from '../types';
import { useDriverTour } from '../hooks/useDriverTour';
import { generateInvoicePDF } from '../utils/pdfGenerator';

interface DeliveryFormProps {
  onBack: () => void;
}

const deliveryFormTourSteps = [
  {
    element: '[data-tour="delivery-form"]',
    popover: {
      title: '📝 Datos de Entrega',
      description: 'Completa todos tus datos personales y dirección de entrega. Todos los campos son obligatorios.',
      side: 'left'
    }
  },
  {
    element: '[data-tour="order-summary-delivery"]',
    popover: {
      title: '💰 Resumen Final',
      description: 'Revisa una vez más tu pedido y el total antes de enviarlo.',
      side: 'left'
    }
  },
  {
    element: '[data-tour="submit-button"]',
    popover: {
      title: '🚀 Enviar Pedido',
      description: 'Una vez completados todos los datos, envía tu pedido y te contactaremos pronto.',
      side: 'top'
    }
  }
];

const DeliveryForm: React.FC<DeliveryFormProps> = ({ onBack }) => {
  const navigate = useNavigate();
  const { cart, total, clearCart, orderNumber } = useOrder();
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [showLocationSelection, setShowLocationSelection] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    neighborhood: '',
    phone: '',
    cedula: '',
    email: '',
    paymentMethod: '',
    requiresInvoice: false,
    dataProcessingAuthorized: false
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderSubmitted, setOrderSubmitted] = useState(false);
  const [showTourButton, setShowTourButton] = useState(true);
  const ticketRef = useRef<HTMLDivElement>(null);

  const { startTour } = useDriverTour({
    steps: deliveryFormTourSteps,
    onDestroyed: () => {
      setShowTourButton(false);
      setTimeout(() => {
        setShowTourButton(true);
      }, 30000);
    }
  });

  // Auto-start tour for first-time users (only when form is visible)
  useEffect(() => {
    if (!showLocationSelection && selectedLocation) {
      const hasSeenTour = localStorage.getItem('parrilleros-delivery-form-tour-seen');
      if (!hasSeenTour) {
        const timer = setTimeout(() => {
          startTour();
          localStorage.setItem('parrilleros-delivery-form-tour-seen', 'true');
        }, 1500);
        return () => clearTimeout(timer);
      }
    }
  }, [startTour, showLocationSelection, selectedLocation]);

  const paymentMethods = [
    'Efectivo',
    'Bancolombia',
    'Nequi',
    'Daviplata'
  ];

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleLocationSelected = (location: Location) => {
    setSelectedLocation(location);
    setShowLocationSelection(false);
  };

  const handleBackToLocationSelection = () => {
    setShowLocationSelection(true);
  };

  const handleStartTour = () => {
    startTour();
  };

  const isFormValid = () => {
    const basicFieldsValid = selectedLocation &&
           formData.name && 
           formData.address && 
           formData.neighborhood && 
           formData.phone && 
           formData.paymentMethod && 
           cart.length > 0 &&
           formData.dataProcessingAuthorized;

    if (formData.requiresInvoice) {
      return basicFieldsValid && formData.cedula && formData.email;
    }

    return basicFieldsValid;
  };

  const generateTicketContent = () => {
    // Cálculos de impuestos corregidos - INC en lugar de IVA
    const subtotal = total * 0.92; // Base gravable (92%)
    const inc = total * 0.08; // INC (8%)

    const cartDetails = cart.map((item, index) => {
      const basePrice = item.withFries ? (item.menuItem.priceWithFries || item.menuItem.price) : item.menuItem.price;
      const customizationsTotal = item.customizations.reduce((sum, option) => sum + option.price, 0);
      const itemSubtotal = (basePrice + customizationsTotal) * item.quantity;
      
      let itemText = `${index + 1}. ${item.menuItem.name}`;
      if (item.withFries) {
        itemText += ' + Papas';
      }
      itemText += ` x${item.quantity} - $${Math.round(itemSubtotal).toLocaleString()}`;
      
      if (item.customizations.length > 0) {
        itemText += `\n   + ${item.customizations.map(c => c.name.replace('AD ', '')).join(', ')}`;
      }
      
      if (item.specialInstructions) {
        itemText += `\n   * ${item.specialInstructions}`;
      }
      
      return itemText;
    }).join('\n\n');

    const invoiceInfo = formData.requiresInvoice ? 
      `\n📄 FACTURA REQUERIDA\nCC: ${formData.cedula} | Email: ${formData.email}` : 
      '\n📄 Sin factura';

    return `🍔 NUEVO PEDIDO DOMICILIO - PARRILLEROS
═══════════════════════════════════════

📋 PEDIDO #${orderNumber.toString().padStart(3, '0')} | ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}

👤 CLIENTE
${formData.name}
📱 ${formData.phone}${invoiceInfo}

📍 ENTREGA
${formData.address}, ${formData.neighborhood}

🛒 PRODUCTOS
${cartDetails}

💰 DESGLOSE DE COSTOS
• Subtotal: $${Math.round(subtotal).toLocaleString()}
• INC (8%): $${Math.round(inc).toLocaleString()}
• TOTAL: $${Math.round(total).toLocaleString()}

💳 Forma de pago: ${formData.paymentMethod}
⏰ Tiempo estimado: 45-60 minutos

¡PROCESAR INMEDIATAMENTE!

📍 ${selectedLocation?.name} | ${selectedLocation?.phone}`;
  };

  const handleDownloadTicket = () => {
    if (!selectedLocation) return;

    const subtotal = total * 0.92;
    const inc = total * 0.08;

    const invoiceData = {
      orderNumber,
      customerName: formData.name,
      customerPhone: formData.phone,
      customerEmail: formData.requiresInvoice ? formData.email : undefined,
      customerCedula: formData.requiresInvoice ? formData.cedula : undefined,
      address: formData.address,
      neighborhood: formData.neighborhood,
      locationName: selectedLocation.name,
      locationAddress: selectedLocation.address,
      locationPhone: selectedLocation.phone,
      items: cart,
      subtotal: Math.round(subtotal),
      iva: Math.round(inc), // Using iva field for INC
      total: Math.round(total),
      paymentMethod: formData.paymentMethod,
      requiresInvoice: formData.requiresInvoice,
      date: new Date()
    };

    generateInvoicePDF(invoiceData);
  };

  const handlePrintTicket = () => {
    if (ticketRef.current) {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>Ticket Parrilleros #${orderNumber.toString().padStart(3, '0')}</title>
              <style>
                @page { 
                  margin: 15mm; 
                  size: A4; 
                }
                
                body { 
                  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
                  font-size: 11px; 
                  line-height: 1.5; 
                  margin: 0; 
                  padding: 0;
                  color: #333;
                  background: white;
                }
                
                .invoice-container {
                  max-width: 800px;
                  margin: 0 auto;
                  background: white;
                  box-shadow: 0 0 20px rgba(0,0,0,0.1);
                  border: 1px solid #ddd;
                }
                
                .header { 
                  background: linear-gradient(135deg, #FF8C00 0%, #FF6B00 100%);
                  color: white;
                  padding: 25px;
                  text-align: center;
                  position: relative;
                }
                
                .header::after {
                  content: '';
                  position: absolute;
                  bottom: -10px;
                  left: 0;
                  right: 0;
                  height: 10px;
                  background: linear-gradient(45deg, transparent 50%, #FF8C00 50%);
                  background-size: 20px 20px;
                }
                
                .company-name {
                  font-size: 28px;
                  font-weight: bold;
                  margin-bottom: 5px;
                  text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
                  letter-spacing: 2px;
                }
                
                .company-tagline {
                  font-size: 14px;
                  opacity: 0.9;
                  font-weight: 300;
                  letter-spacing: 1px;
                }
                
                .invoice-title {
                  background: #f8f9fa;
                  border-left: 5px solid #FF8C00;
                  padding: 20px;
                  margin: 20px 0;
                }
                
                .invoice-number {
                  font-size: 24px;
                  font-weight: bold;
                  color: #FF8C00;
                  margin-bottom: 5px;
                }
                
                .invoice-date {
                  color: #666;
                  font-size: 12px;
                }
                
                .info-section {
                  display: flex;
                  justify-content: space-between;
                  margin: 30px 0;
                  gap: 30px;
                }
                
                .info-box {
                  flex: 1;
                  background: #f8f9fa;
                  border: 1px solid #e9ecef;
                  border-radius: 8px;
                  padding: 20px;
                }
                
                .info-title {
                  font-weight: bold;
                  color: #FF8C00;
                  font-size: 14px;
                  margin-bottom: 15px;
                  text-transform: uppercase;
                  letter-spacing: 1px;
                  border-bottom: 2px solid #FF8C00;
                  padding-bottom: 5px;
                }
                
                .info-content {
                  line-height: 1.6;
                }
                
                .info-content p {
                  margin: 8px 0;
                  color: #555;
                }
                
                .items-table {
                  width: 100%;
                  border-collapse: collapse;
                  margin: 30px 0;
                  background: white;
                  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                  border-radius: 8px;
                  overflow: hidden;
                }
                
                .items-table th {
                  background: linear-gradient(135deg, #FF8C00 0%, #FF6B00 100%);
                  color: white;
                  padding: 15px;
                  text-align: left;
                  font-weight: bold;
                  text-transform: uppercase;
                  letter-spacing: 0.5px;
                  font-size: 11px;
                }
                
                .items-table td {
                  padding: 15px;
                  border-bottom: 1px solid #e9ecef;
                  vertical-align: top;
                }
                
                .items-table tr:nth-child(even) {
                  background: #f8f9fa;
                }
                
                .items-table tr:hover {
                  background: #fff3e0;
                }
                
                .item-name {
                  font-weight: bold;
                  color: #333;
                  margin-bottom: 5px;
                }
                
                .item-extras {
                  font-size: 10px;
                  color: #666;
                  font-style: italic;
                  margin-top: 3px;
                }
                
                .item-instructions {
                  font-size: 10px;
                  color: #888;
                  margin-top: 3px;
                  background: #f0f0f0;
                  padding: 3px 6px;
                  border-radius: 3px;
                }
                
                .price {
                  font-weight: bold;
                  color: #FF8C00;
                  text-align: right;
                }
                
                .totals-section {
                  background: #f8f9fa;
                  border: 2px solid #e9ecef;
                  border-radius: 8px;
                  padding: 25px;
                  margin: 30px 0;
                  max-width: 400px;
                  margin-left: auto;
                }
                
                .totals-title {
                  font-size: 16px;
                  font-weight: bold;
                  color: #333;
                  margin-bottom: 15px;
                  text-align: center;
                  text-transform: uppercase;
                  letter-spacing: 1px;
                }
                
                .total-row {
                  display: flex;
                  justify-content: space-between;
                  margin: 10px 0;
                  padding: 8px 0;
                }
                
                .total-row.subtotal {
                  border-bottom: 1px solid #ddd;
                }
                
                .total-row.final {
                  border-top: 2px solid #FF8C00;
                  font-size: 18px;
                  font-weight: bold;
                  color: #FF8C00;
                  background: white;
                  margin-top: 15px;
                  padding: 15px 0;
                  border-radius: 5px;
                }
                
                .payment-info {
                  background: #e3f2fd;
                  border: 1px solid #2196f3;
                  border-radius: 8px;
                  padding: 20px;
                  margin: 30px 0;
                  text-align: center;
                }
                
                .payment-title {
                  font-weight: bold;
                  color: #1976d2;
                  margin-bottom: 10px;
                  font-size: 14px;
                }
                
                .delivery-info {
                  background: #e8f5e8;
                  border: 1px solid #4caf50;
                  border-radius: 8px;
                  padding: 20px;
                  margin: 30px 0;
                  text-align: center;
                }
                
                .delivery-title {
                  font-weight: bold;
                  color: #2e7d32;
                  margin-bottom: 10px;
                  font-size: 14px;
                }
                
                .footer {
                  background: #333;
                  color: white;
                  padding: 25px;
                  text-align: center;
                  margin-top: 40px;
                }
                
                .footer-title {
                  font-size: 16px;
                  font-weight: bold;
                  margin-bottom: 10px;
                }
                
                .footer-text {
                  font-size: 11px;
                  opacity: 0.8;
                  line-height: 1.6;
                }
                
                .qr-section {
                  text-align: center;
                  margin: 30px 0;
                  padding: 20px;
                  background: #f8f9fa;
                  border-radius: 8px;
                }
                
                .qr-placeholder {
                  width: 80px;
                  height: 80px;
                  border: 2px solid #ddd;
                  margin: 0 auto 10px;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  font-size: 10px;
                  color: #666;
                  background: white;
                }
                
                .watermark {
                  position: fixed;
                  top: 50%;
                  left: 50%;
                  transform: translate(-50%, -50%) rotate(-45deg);
                  font-size: 120px;
                  color: rgba(255, 140, 0, 0.05);
                  font-weight: bold;
                  z-index: -1;
                  pointer-events: none;
                }
                
                @media print {
                  .invoice-container {
                    box-shadow: none;
                    border: none;
                  }
                  
                  .watermark {
                    position: absolute;
                  }
                }
              </style>
            </head>
            <body>
              <div class="watermark">PARRILLEROS</div>
              <div class="invoice-container">
                <!-- Header -->
                <div class="header">
                  <div class="company-name">PARRILLEROS</div>
                  <div class="company-tagline">FAST FOOD - Hamburguesas Artesanales</div>
                </div>
                
                <!-- Invoice Title -->
                <div class="invoice-title">
                  <div class="invoice-number">FACTURA DE VENTA #${orderNumber.toString().padStart(3, '0')}</div>
                  <div class="invoice-date">${new Date().toLocaleDateString('es-CO', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })} - ${new Date().toLocaleTimeString('es-CO')}</div>
                </div>
                
                <!-- Info Section -->
                <div class="info-section">
                  <div class="info-box">
                    <div class="info-title">📍 Información de la Sede</div>
                    <div class="info-content">
                      <p><strong>${selectedLocation?.name}</strong></p>
                      <p>${selectedLocation?.address}</p>
                      <p>📞 ${selectedLocation?.phone}</p>
                      <p>📱 WhatsApp: ${selectedLocation?.whatsapp}</p>
                    </div>
                  </div>
                  
                  <div class="info-box">
                    <div class="info-title">👤 Datos del Cliente</div>
                    <div class="info-content">
                      <p><strong>Nombre:</strong> ${formData.name}</p>
                      <p><strong>Teléfono:</strong> ${formData.phone}</p>
                      <p><strong>Dirección:</strong> ${formData.address}</p>
                      <p><strong>Barrio:</strong> ${formData.neighborhood}</p>
                      ${formData.requiresInvoice ? `
                        <p><strong>CC:</strong> ${formData.cedula}</p>
                        <p><strong>Email:</strong> ${formData.email}</p>
                      ` : ''}
                    </div>
                  </div>
                </div>
                
                <!-- Items Table -->
                <table class="items-table">
                  <thead>
                    <tr>
                      <th style="width: 5%">#</th>
                      <th style="width: 50%">Producto</th>
                      <th style="width: 10%">Cant.</th>
                      <th style="width: 15%">Precio Unit.</th>
                      <th style="width: 20%">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${cart.map((item, index) => {
                      const basePrice = item.withFries ? (item.menuItem.priceWithFries || item.menuItem.price) : item.menuItem.price;
                      const customizationsTotal = item.customizations.reduce((sum, option) => sum + option.price, 0);
                      const unitPrice = basePrice + customizationsTotal;
                      const itemTotal = unitPrice * item.quantity;
                      
                      return `
                        <tr>
                          <td style="text-align: center; font-weight: bold;">${index + 1}</td>
                          <td>
                            <div class="item-name">${item.menuItem.name}${item.withFries ? ' + Papas Francesas' : ''}</div>
                            ${item.customizations.length > 0 ? `
                              <div class="item-extras">+ ${item.customizations.map(c => c.name.replace('AD ', '')).join(', ')}</div>
                            ` : ''}
                            ${item.specialInstructions ? `
                              <div class="item-instructions">📝 ${item.specialInstructions}</div>
                            ` : ''}
                          </td>
                          <td style="text-align: center; font-weight: bold;">${item.quantity}</td>
                          <td class="price">$${unitPrice.toLocaleString()}</td>
                          <td class="price">$${itemTotal.toLocaleString()}</td>
                        </tr>
                      `;
                    }).join('')}
                  </tbody>
                </table>
                
                <!-- Totals Section -->
                <div class="totals-section">
                  <div class="totals-title">💰 Resumen de Costos</div>
                  <div class="total-row subtotal">
                    <span>Subtotal:</span>
                    <span>$${Math.round(subtotal).toLocaleString()}</span>
                  </div>
                  <div class="total-row">
                    <span>INC (8%):</span>
                    <span>$${Math.round(inc).toLocaleString()}</span>
                  </div>
                  <div class="total-row final">
                    <span>TOTAL A PAGAR:</span>
                    <span>$${Math.round(total).toLocaleString()}</span>
                  </div>
                </div>
                
                <!-- Payment Info -->
                <div class="payment-info">
                  <div class="payment-title">💳 Información de Pago</div>
                  <p><strong>Forma de pago:</strong> ${formData.paymentMethod}</p>
                  <p>El pago se realizará contra entrega del pedido</p>
                </div>
                
                <!-- Delivery Info -->
                <div class="delivery-info">
                  <div class="delivery-title">🚚 Información de Entrega</div>
                  <p><strong>Tiempo estimado:</strong> 45-60 minutos</p>
                  <p><strong>Estado:</strong> En preparación</p>
                  <p>Te contactaremos pronto para confirmar la entrega</p>
                </div>
                
                <!-- QR Section -->
                <div class="qr-section">
                  <div class="qr-placeholder">
                    QR CODE<br>
                    PEDIDO<br>
                    #${orderNumber.toString().padStart(3, '0')}
                  </div>
                  <p style="font-size: 10px; color: #666;">Código QR para seguimiento del pedido</p>
                </div>
                
                <!-- Footer -->
                <div class="footer">
                  <div class="footer-title">¡Gracias por tu preferencia!</div>
                  <div class="footer-text">
                    PARRILLEROS FAST FOOD - Hamburguesas artesanales a la parrilla<br>
                    Síguenos en redes sociales para promociones especiales<br>
                    Factura generada automáticamente el ${new Date().toLocaleString('es-CO')}
                  </div>
                </div>
              </div>
            </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.print();
      }
    }
  };

  const handleSubmit = async () => {
    if (!isFormValid() || !selectedLocation) return;
    
    setIsSubmitting(true);
    
    // Simulate order processing and redirect directly
    setTimeout(() => {
      // Construct WhatsApp message with exact format
      const message = generateTicketContent();
      
      // Encode message and create WhatsApp URL with selected location's WhatsApp
      const encodedMessage = encodeURIComponent(message);
      const whatsappUrl = `https://wa.me/${selectedLocation.whatsapp}?text=${encodedMessage}`;

      // Open WhatsApp in a new tab
      window.open(whatsappUrl, '_blank');
      
      // Clear cart and redirect to home immediately
      clearCart();
      navigate('/');
    }, 2000);
  };

  const handleFinish = () => {
    clearCart();
    navigate('/');
  };

  // Show location selection page
  if (showLocationSelection) {
    return (
      <LocationSelectionPage
        onLocationSelected={handleLocationSelected}
        onBack={onBack}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-6 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center mb-4">
            <button
              onClick={handleBackToLocationSelection}
              className="mr-4 p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-800 flex items-center">
                <Truck size={28} className="mr-2 text-[#FF8C00]" />
                Datos de Entrega
              </h1>
              <p className="text-gray-600">Completa tus datos para procesar tu pedido</p>
            </div>
          </div>
          
          {/* Selected Location Info */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mr-3">
                <CheckCircle size={16} className="text-green-600" />
              </div>
              <div>
                <p className="font-medium text-green-800">
                  Sede seleccionada: <span className="font-heavyrust-primary">{selectedLocation?.name}</span>
                </p>
                <p className="text-sm text-green-600">
                  {selectedLocation?.address} | {selectedLocation?.phone}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Form */}
          <div className="space-y-6">
            {/* Form */}
            <div className="bg-white rounded-lg shadow-md p-6" data-tour="delivery-form">
              <h2 className="text-xl font-bold mb-6 text-gray-800">Información Personal</h2>
              
              <div className="space-y-4">
                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <User size={16} className="inline mr-2" />
                    Nombre completo *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF8C00] focus:border-transparent"
                    placeholder="Ingresa tu nombre completo"
                  />
                </div>

                {/* Address */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <MapPin size={16} className="inline mr-2" />
                    Dirección *
                  </label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => handleInputChange('address', e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF8C00] focus:border-transparent"
                    placeholder="Calle, carrera, número"
                  />
                </div>

                {/* Neighborhood */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Barrio *
                  </label>
                  <input
                    type="text"
                    value={formData.neighborhood}
                    onChange={(e) => handleInputChange('neighborhood', e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF8C00] focus:border-transparent"
                    placeholder="Escribe el nombre de tu barrio"
                  />
                  <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-xs text-blue-800 font-medium mb-1">
                      📍 Zonas de entrega para <span className="font-heavyrust-primary">{selectedLocation?.name}</span>:
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {selectedLocation?.deliveryZones.map((zone, index) => (
                        <span
                          key={index}
                          className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs"
                        >
                          {zone}
                        </span>
                      ))}
                    </div>

                  </div>
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Phone size={16} className="inline mr-2" />
                    Número de celular *
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF8C00] focus:border-transparent"
                    placeholder="3001234567"
                  />
                </div>

                {/* Invoice Option */}
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.requiresInvoice}
                      onChange={(e) => handleInputChange('requiresInvoice', e.target.checked)}
                      className="w-4 h-4 accent-[#FF8C00] mr-3"
                    />
                    <div>
                      <span className="font-medium text-gray-800 flex items-center">
                        <Receipt size={16} className="mr-2 text-[#FF8C00]" />
                        ¿Requiere factura a su nombre?
                      </span>
                      <p className="text-sm text-gray-600 mt-1">
                        Si necesita factura, marque esta opción y complete los campos adicionales
                      </p>
                    </div>
                  </label>
                </div>

                {/* Conditional fields for invoice */}
                {formData.requiresInvoice && (
                  <div className="space-y-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <h3 className="font-medium text-gray-800 mb-3">Datos para facturación</h3>
                    
                    {/* Cedula */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <FileText size={16} className="inline mr-2" />
                        Número de cédula *
                      </label>
                      <input
                        type="text"
                        value={formData.cedula}
                        onChange={(e) => handleInputChange('cedula', e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF8C00] focus:border-transparent"
                        placeholder="12345678"
                      />
                    </div>

                    {/* Email */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <Mail size={16} className="inline mr-2" />
                        Correo electrónico *
                      </label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF8C00] focus:border-transparent"
                        placeholder="tu@email.com"
                      />
                    </div>
                  </div>
                )}

                {/* Payment Method */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <CreditCard size={16} className="inline mr-2" />
                    Forma de pago *
                  </label>
                  <select
                    value={formData.paymentMethod}
                    onChange={(e) => handleInputChange('paymentMethod', e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF8C00] focus:border-transparent"
                  >
                    <option value="">Selecciona forma de pago</option>
                    {paymentMethods.map((method) => (
                      <option key={method} value={method}>
                        {method}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Data Processing Authorization */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <label className="flex items-start cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.dataProcessingAuthorized}
                      onChange={(e) => handleInputChange('dataProcessingAuthorized', e.target.checked)}
                      className="w-4 h-4 accent-[#FF8C00] mr-3 mt-1 flex-shrink-0"
                    />
                    <div className="text-sm">
                      <span className="font-medium text-gray-800">
                        Autorizo el tratamiento de mis datos personales *
                      </span>
                      <p className="text-gray-600 mt-1">
                        Acepto que mis datos personales sean utilizados para procesar mi pedido y contactarme. 
                        <a 
                          href="/privacy-policy" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-[#FF8C00] hover:text-orange-600 font-medium ml-1 inline-flex items-center"
                        >
                          Ver política de tratamiento de datos
                          <ExternalLink size={12} className="ml-1" />
                        </a>
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Submit Button */}
              <button
                data-tour="submit-button"
                onClick={handleSubmit}
                disabled={!isFormValid() || isSubmitting}
                className={`w-full mt-6 py-4 font-bold rounded-lg text-lg flex items-center justify-center transition-all ${
                  isFormValid() && !isSubmitting
                    ? 'bg-[#FF8C00] text-white hover:bg-orange-600 shadow-lg hover:shadow-xl transform hover:scale-[1.02]'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Enviando pedido...
                  </>
                ) : (
                  <>
                    <Send size={20} className="mr-2" />
                    Enviar Pedido a Domicilio
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Right Column - Order Summary */}
          <div className="bg-white rounded-lg shadow-md p-6" data-tour="order-summary-delivery">
            <OrderSummary />
          </div>
        </div>

        {/* Tour Button - Pequeño en esquina inferior izquierda */}
        {showTourButton && !orderSubmitted && (
          <TourButton 
            onStartTour={handleStartTour}
            variant="floating"
            size="sm"
            className="bottom-6 left-6"
          />
        )}
      </div>
    </div>
  );
};

export default DeliveryForm;