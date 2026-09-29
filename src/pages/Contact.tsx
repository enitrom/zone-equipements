import React, { useState } from 'react';
import { Mail, Phone, MapPin, Send, MessageCircle, CheckCircle2 } from 'lucide-react';
import { useLanguage } from '../LanguageContext';
import { catalogService } from '../services/catalogService';

export default function Contact() {
  const { language } = useLanguage();
  const [formState, setFormState] = useState({
    name: '',
    email: '',
    phone: '',
    sector: '',
    subject: '',
    message: ''
  });
  const [submitted, setSubmitted] = useState(false);

  const copy = {
    fr: {
      title: "Contactez Zone Équipements Sénégal",
      subtitle: "Notre équipe d'ingénieurs technico-commerciaux est à votre disposition pour toute demande de devis, de sourcing ou d'assistance.",
      infoTitle: "Informations de contact",
      emailTitle: "Email Professionnel",
      emailSub: "Réponse sous 24h ouvrées",
      waTitle: "WhatsApp Direct 24/7",
      waSub: "Assistance immédiate",
      phoneTitle: "Téléphone Direct",
      phoneSub: "Lun-Sam, 8h-19h GMT",
      hqTitle: "Siège & Entrepôt",
      hqCity: "Dakar, Sénégal",
      hqAddr: "Km 4, Boulevard du Centenaire, Dakar",
      formTitle: "Envoyez-nous un message",
      nameLabel: "Nom complet *",
      namePh: "Amadou Ndiaye",
      emailLabel: "Email professionnel *",
      emailPh: "contact@entreprise.sn",
      phoneLabel: "Téléphone / WhatsApp *",
      phonePh: "+221 77 000 00 00",
      sectorLabel: "Secteur d'activité *",
      sectorSelect: "Sélectionnez un secteur...",
      sectorMines: "Mines & Extraction",
      sectorAgri: "Agriculture & Agro-industrie",
      sectorBtp: "BTP & Construction",
      sectorEnergy: "Énergie & Industrie",
      sectorOther: "Autre secteur",
      subjectLabel: "Sujet *",
      subjectPh: "Demande de devis Proforma, Sourcing d'équipement...",
      messageLabel: "Message *",
      messagePh: "Décrivez votre besoin technique, références et quantités souhaitées...",
      submitBtn: "Envoyer le message",
      privacyNote: "En soumettant ce formulaire, vos informations sont traitées confidentiellement par notre service commercial.",
      successTitle: "Message transmis avec succès !",
      successDesc: "Votre demande a bien été enregistrée par notre bureau de Dakar. Un conseiller technique vous répondra sous 24h.",
      newMsgBtn: "Envoyer un autre message"
    },
    en: {
      title: "Contact Zone Équipements Senegal",
      subtitle: "Our sales engineering team is at your disposal for any quote request, custom sourcing, or technical assistance.",
      infoTitle: "Contact Information",
      emailTitle: "Business Email",
      emailSub: "Reply within 24 business hours",
      waTitle: "24/7 Direct WhatsApp",
      waSub: "Immediate assistance",
      phoneTitle: "Direct Phone",
      phoneSub: "Mon-Sat, 8am-7pm GMT",
      hqTitle: "Headquarters & Warehouse",
      hqCity: "Dakar, Senegal",
      hqAddr: "Km 4, Boulevard du Centenaire, Dakar",
      formTitle: "Send Us a Message",
      nameLabel: "Full Name *",
      namePh: "John Doe",
      emailLabel: "Business Email *",
      emailPh: "contact@company.com",
      phoneLabel: "Phone / WhatsApp *",
      phonePh: "+221 77 000 00 00",
      sectorLabel: "Industry Sector *",
      sectorSelect: "Select a sector...",
      sectorMines: "Mining & Extraction",
      sectorAgri: "Agriculture & Agribusiness",
      sectorBtp: "Construction & Civil Engineering",
      sectorEnergy: "Energy & Manufacturing",
      sectorOther: "Other sector",
      subjectLabel: "Subject *",
      subjectPh: "Proforma Quote Request, Equipment Sourcing...",
      messageLabel: "Message *",
      messagePh: "Describe your technical requirements, part numbers, and quantities...",
      submitBtn: "Send Message",
      privacyNote: "By submitting this form, your data is processed confidentially by our B2B sales department.",
      successTitle: "Message Sent Successfully!",
      successDesc: "Your inquiry has been logged by our Dakar office. A technical advisor will get back to you within 24 hours.",
      newMsgBtn: "Send another message"
    },
    es: {
      title: "Contacte con Zone Équipements Senegal",
      subtitle: "Nuestro equipo de ingenieros comerciales está a su disposición para cualquier solicitud de presupuesto, sourcing o asistencia técnica.",
      infoTitle: "Información de contacto",
      emailTitle: "Correo Profesional",
      emailSub: "Respuesta en 24h hábiles",
      waTitle: "WhatsApp Directo 24/7",
      waSub: "Asistencia inmediata",
      phoneTitle: "Teléfono Directo",
      phoneSub: "Lun-Sáb, 8h-19h GMT",
      hqTitle: "Sede y Almacén",
      hqCity: "Dakar, Senegal",
      hqAddr: "Km 4, Boulevard du Centenaire, Dakar",
      formTitle: "Envíenos un mensaje",
      nameLabel: "Nombre completo *",
      namePh: "Juan Pérez",
      emailLabel: "Correo electrónico *",
      emailPh: "contacto@empresa.com",
      phoneLabel: "Teléfono / WhatsApp *",
      phonePh: "+221 77 000 00 00",
      sectorLabel: "Sector de actividad *",
      sectorSelect: "Seleccione un sector...",
      sectorMines: "Minería y Extracción",
      sectorAgri: "Agricultura y Agroindustria",
      sectorBtp: "Construcción y Obra Pública",
      sectorEnergy: "Energía e Industria",
      sectorOther: "Otro sector",
      subjectLabel: "Asunto *",
      subjectPh: "Solicitud de factura Proforma, Sourcing...",
      messageLabel: "Mensaje *",
      messagePh: "Describa su necesidad técnica, referencias y cantidades...",
      submitBtn: "Enviar mensaje",
      privacyNote: "Al enviar este formulario, sus datos son tratados confidencialmente por nuestro departamento comercial.",
      successTitle: "¡Mensaje enviado con éxito!",
      successDesc: "Su solicitud ha sido registrada por nuestra oficina en Dakar. Le responderemos en menos de 24h.",
      newMsgBtn: "Enviar otro mensaje"
    },
    zh: {
      title: "联系 Zone Équipements 塞内加尔",
      subtitle: "我们的工业销售工程师团队随时为您提供形式发票报价、原厂定制寻源及技术支持服务。",
      infoTitle: "联系方式",
      emailTitle: "企业邮箱",
      emailSub: "24个工作小时内回复",
      waTitle: "24/7 WhatsApp 专线",
      waSub: "即时在线响应",
      phoneTitle: "直拨电话",
      phoneSub: "周一至周六 8:00-19:00 GMT",
      hqTitle: "总部与达喀尔仓库",
      hqCity: "塞内加尔 达喀尔",
      hqAddr: "Km 4, Boulevard du Centenaire, Dakar",
      formTitle: "在线发送咨询信息",
      nameLabel: "联系人姓名 *",
      namePh: "输入您的姓名",
      emailLabel: "电子邮箱 *",
      emailPh: "contact@company.com",
      phoneLabel: "联系电话 / WhatsApp *",
      phonePh: "+221 77 000 00 00",
      sectorLabel: "所属行业 *",
      sectorSelect: "请选择行业...",
      sectorMines: "矿山与采掘",
      sectorAgri: "农业与农产品加工",
      sectorBtp: "建筑与工程施工",
      sectorEnergy: "能源与工业制造",
      sectorOther: "其他行业",
      subjectLabel: "咨询主题 *",
      subjectPh: "申请形式发票、设备寻源报价...",
      messageLabel: "详细需求 *",
      messagePh: "请描述您的设备型号、技术参数或采购数量...",
      submitBtn: "提交咨询",
      privacyNote: "提交此表单即表示您的信息将由我们的B2B商务部门严格保密处理。",
      successTitle: "咨询信息已成功提交！",
      successDesc: "达喀尔办公室已收到您的需求，我们的技术顾问将在24小时内与您联系。",
      newMsgBtn: "发送新消息"
    }
  }[language];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formState.name.trim() || !formState.message.trim()) return;
    catalogService.logAction(
      formState.name.trim(),
      'Message Contact B2B',
      `[${formState.sector || 'Général'}] ${formState.subject} — Tél: ${formState.phone} — Email: ${formState.email}`,
      'commande'
    );
    setSubmitted(true);
  };

  return (
    <div className="bg-gray-50 min-h-screen py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold font-roboto text-[#003366] mb-4">{copy.title}</h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            {copy.subtitle}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
          
          {/* Contact Info */}
          <div>
            <div className="bg-[#003366] text-white rounded-2xl p-10 shadow-lg relative overflow-hidden">
              <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
              <div className="absolute -top-24 -left-24 w-64 h-64 bg-[#FF6600]/20 rounded-full blur-3xl"></div>
              
              <h2 className="text-3xl font-bold font-roboto mb-8 relative z-10">{copy.infoTitle}</h2>
              
              <div className="space-y-8 relative z-10">
                <div className="flex items-start gap-4">
                  <div className="bg-white/10 p-3 rounded-lg">
                    <Mail className="w-6 h-6 text-[#FF6600]" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg mb-1">{copy.emailTitle}</h3>
                    <a href="mailto:zoneequipements@gmail.com" className="text-gray-300 hover:text-white transition-colors">zoneequipements@gmail.com</a>
                    <p className="text-sm text-gray-400 mt-1">{copy.emailSub}</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="bg-white/10 p-3 rounded-lg">
                    <MessageCircle className="w-6 h-6 text-[#FF6600]" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg mb-1">{copy.waTitle}</h3>
                    <a href="https://wa.me/221766538384" target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-white hover:underline transition-colors">
                      +221 76 653 83 84 (00221766538384)
                    </a>
                    <p className="text-sm text-gray-400 mt-1">{copy.waSub}</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="bg-white/10 p-3 rounded-lg">
                    <Phone className="w-6 h-6 text-[#FF6600]" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg mb-1">{copy.phoneTitle}</h3>
                    <a href="tel:+221766538384" className="text-gray-300 hover:text-white transition-colors">
                      +221 76 653 83 84
                    </a>
                    <p className="text-sm text-gray-400 mt-1">{copy.phoneSub}</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="bg-white/10 p-3 rounded-lg">
                    <MapPin className="w-6 h-6 text-[#FF6600]" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg mb-1">{copy.hqTitle}</h3>
                    <p className="text-gray-300">{copy.hqCity}</p>
                    <p className="text-sm text-gray-400 mt-1">{copy.hqAddr}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <div className="bg-white rounded-2xl p-10 shadow-sm border border-gray-100">
            <h2 className="text-3xl font-bold font-roboto text-[#003366] mb-8">{copy.formTitle}</h2>
            
            {submitted ? (
              <div className="py-12 text-center space-y-4">
                <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-[#003366]">{copy.successTitle}</h3>
                <p className="text-sm text-gray-600 max-w-md mx-auto">{copy.successDesc}</p>
                <div className="pt-4 flex flex-wrap justify-center gap-3">
                  <a
                    href={`https://wa.me/221766538384?text=${encodeURIComponent(`Bonjour Zone Équipements, je suis ${formState.name} (${formState.subject}) : ${formState.message}`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-5 py-2.5 bg-[#25D366] hover:bg-[#128C7E] text-white font-bold rounded-xl text-xs flex items-center gap-2"
                  >
                    <MessageCircle className="w-4 h-4" /> WhatsApp Direct
                  </a>
                  <button
                    type="button"
                    onClick={() => {
                      setSubmitted(false);
                      setFormState({ name: '', email: '', phone: '', sector: '', subject: '', message: '' });
                    }}
                    className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-xs cursor-pointer"
                  >
                    {copy.newMsgBtn}
                  </button>
                </div>
              </div>
            ) : (
              <form className="space-y-5" onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label htmlFor="name" className="block text-sm font-bold text-gray-700 mb-1.5">{copy.nameLabel}</label>
                    <input
                      type="text"
                      id="name"
                      required
                      value={formState.name}
                      onChange={e => setFormState({ ...formState, name: e.target.value })}
                      className="w-full border border-gray-300 rounded-md px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#FF6600] focus:border-transparent transition-shadow"
                      placeholder={copy.namePh}
                    />
                  </div>
                  <div>
                    <label htmlFor="email" className="block text-sm font-bold text-gray-700 mb-1.5">{copy.emailLabel}</label>
                    <input
                      type="email"
                      id="email"
                      required
                      value={formState.email}
                      onChange={e => setFormState({ ...formState, email: e.target.value })}
                      className="w-full border border-gray-300 rounded-md px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#FF6600] focus:border-transparent transition-shadow"
                      placeholder={copy.emailPh}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label htmlFor="phone" className="block text-sm font-bold text-gray-700 mb-1.5">{copy.phoneLabel}</label>
                    <input
                      type="tel"
                      id="phone"
                      required
                      value={formState.phone}
                      onChange={e => setFormState({ ...formState, phone: e.target.value })}
                      className="w-full border border-gray-300 rounded-md px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#FF6600] focus:border-transparent transition-shadow"
                      placeholder={copy.phonePh}
                    />
                  </div>
                  <div>
                    <label htmlFor="sector" className="block text-sm font-bold text-gray-700 mb-1.5">{copy.sectorLabel}</label>
                    <select
                      id="sector"
                      required
                      value={formState.sector}
                      onChange={e => setFormState({ ...formState, sector: e.target.value })}
                      className="w-full border border-gray-300 rounded-md px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#FF6600] focus:border-transparent transition-shadow"
                    >
                      <option value="">{copy.sectorSelect}</option>
                      <option value="Mines & Extraction">{copy.sectorMines}</option>
                      <option value="Agriculture & Agro-industrie">{copy.sectorAgri}</option>
                      <option value="BTP & Construction">{copy.sectorBtp}</option>
                      <option value="Énergie & Industrie">{copy.sectorEnergy}</option>
                      <option value="Autre">{copy.sectorOther}</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label htmlFor="subject" className="block text-sm font-bold text-gray-700 mb-1.5">{copy.subjectLabel}</label>
                  <input
                    type="text"
                    id="subject"
                    required
                    value={formState.subject}
                    onChange={e => setFormState({ ...formState, subject: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#FF6600] focus:border-transparent transition-shadow"
                    placeholder={copy.subjectPh}
                  />
                </div>

                <div>
                  <label htmlFor="message" className="block text-sm font-bold text-gray-700 mb-1.5">{copy.messageLabel}</label>
                  <textarea
                    id="message"
                    rows={4}
                    required
                    value={formState.message}
                    onChange={e => setFormState({ ...formState, message: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#FF6600] focus:border-transparent transition-shadow resize-none"
                    placeholder={copy.messagePh}
                  />
                </div>

                <button type="submit" className="w-full bg-[#FF6600] hover:bg-[#e65c00] text-white font-bold py-4 rounded-md transition-colors flex items-center justify-center gap-2 text-lg cursor-pointer">
                  {copy.submitBtn} <Send className="w-5 h-5" />
                </button>
                <p className="text-xs text-gray-400 text-center mt-4">
                  {copy.privacyNote}
                </p>
              </form>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
