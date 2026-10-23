import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { FaInstagram, FaPhoneAlt } from 'react-icons/fa'
import { FaChevronRight } from 'react-icons/fa6'
import Footer from '../components/Footer'
import InfiniteSpiral from '../components/InfiniteSpiral'

const heroImageMobile = '/hero-barber.jpg'
const heroImageDesktop = '/hero-barber-pc.png'
const revealProps = {
  initial: { opacity: 0, y: 34 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.35 },
  transition: { duration: 1.25, ease: [0.22, 1, 0.36, 1] },
}

const images = [
  { src: '/galery/1.jpg', alt: 'Muhammed Barber saç kesimi' },
  { src: '/galery/2.jfif', alt: 'Muhammed Barber sakal tıraşı' },
  { src: '/galery/3.jfif', alt: 'Muhammed Barber salon detayı' },
  { src: '/galery/4.jfif', alt: 'Çankırı Merkez berber hizmeti' },
  { src: '/galery/5.jfif', alt: 'Çankırı modern erkek kuaförü' },
  { src: '/galery/6.jfif', alt: 'Profesyonel berber işçiliği' },
  { src: '/galery/7.jfif', alt: 'Çankırı Merkez berber hizmeti' },
  { src: '/galery/8.jfif', alt: 'Çankırı erkek kuaförü' },
  { src: '/galery/6.jfif', alt: 'Profesyonel berber işçiliği' },
]

const reviews = [
  {
    name: 'Emir K.',
    text: 'Saç kesimi de sakal da tam istediğim gibi oldu. Koltuktan kalkınca farkı direkt hissediyorsun.',
  },
  {
    name: 'Burak A.',
    text: "Çankırı Merkez'de gittiğim en temiz ve en rahat berber deneyimlerinden biri.",
  },
  {
    name: 'Mert Y.',
    text: 'Detaylara cok dikkat ediyorlar. Randevu saatinde alindim, sonuc gercekten iyi.',
  },
  {
    name: 'Caner D.',
    text: 'Salonun enerjisi cok iyi. Hem sohbet hem iscilik ayni seviyede kaliteli.',
  },
  {
    name: 'Ahmet S.',
    text: 'Fade kesimde net cizgi ve temiz bitis istiyorsan adres belli.',
  },
  {
    name: 'Yusuf T.',
    text: 'Sakal toparlama cok basariliydi. Yuz sekline gore calisiyorlar.',
  },
  {
    name: 'Ozan B.',
    text: 'Ilk kez gittim, artik randevumu buradan alirim. Cok temiz is.',
  },
  {
    name: 'Kadir E.',
    text: "Çankırı'da modern berber deneyimi arayanlara rahatlıkla öneririm.",
  },
  {
    name: 'Furkan G.',
    text: 'Detaylara takilan biri olarak soyluyorum, sonuc gercekten pismedi.',
  },
  {
    name: 'Enes R.',
    text: 'Hem hizli hem ozenli. En guzel tarafi da ne istedigini iyi anlamalari.',
  },
  {
    name: 'Berk N.',
    text: 'Fotografta gosterdigim modeli birebir yakaladilar. Elinize saglik.',
  },
  {
    name: 'Alihan M.',
    text: 'Koltuga oturunca isi bilen birine geldigin belli oluyor.',
  },
]
const defaultServices = [
  { id: 'sac-kesimi', name: 'Saç kesimi', price: '350 TL', detail: 'Klasik, modern ve fade kesim' },
  { id: 'sakal-tirasi', name: 'Sakal tıraşı', price: '200 TL', detail: 'Hat belirleme ve sıcak havlu' },
  { id: 'sac-sakal-yikama', name: 'Saç + sakal', price: '500 TL', detail: 'Tam bakım paketi' },
  { id: 'cocuk-kesimi', name: 'Çocuk kesimi', price: '250 TL', detail: 'Rahat ve hızlı kesim' },
  { id: 'damat-bakimi', name: 'Damat bakımı', price: '900 TL', detail: 'Özel gün hazırlığı' },
]
const services = defaultServices

const apiBaseUrl = import.meta.env.VITE_API_URL || ''

const faqs = [
  {
    question: 'Randevu almak zorunlu mu?',
    answer: 'Randevu almanizi oneririz. Musaitlik varsa randevusuz da yardimci oluruz.',
  },
  {
    question: 'Saç sakal işlemi ne kadar sürer?',
    answer: 'Saç ve sakal bakımı ortalama 50-60 dakika sürer. Seçilen modele göre süre değişebilir.',
  },
  {
    question: 'Odeme nasil yapiliyor?',
    answer: 'Salonda nakit veya kart ile odeme yapabilirsiniz.',
  },
  {
    question: 'Cocuk kesimi yapiyor musunuz?',
    answer: 'Evet, cocuk kesimi icin de randevu olusturabilirsiniz.',
  },
]

function CountUp({ end, suffix = '', prefix = '' }) {
  const [value, setValue] = useState(0)
  const [hasStarted, setHasStarted] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const element = ref.current

    if (!element) {
      return undefined
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setHasStarted(true)
          observer.disconnect()
        }
      },
      { threshold: 0.35 },
    )

    observer.observe(element)

    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!hasStarted) {
      return undefined
    }

    let frameId
    const duration = 1400
    const startTime = performance.now()

    const animate = (currentTime) => {
      const progress = Math.min((currentTime - startTime) / duration, 1)
      const easedProgress = 1 - (1 - progress) ** 3

      setValue(Math.round(end * easedProgress))

      if (progress < 1) {
        frameId = requestAnimationFrame(animate)
      }
    }

    frameId = requestAnimationFrame(animate)

    return () => cancelAnimationFrame(frameId)
  }, [end, hasStarted])

  return (
    <strong ref={ref}>
      {prefix}
      {value}
      {suffix}
    </strong>
  )
}

function Home({ theme }) {
  const [openFaqIndex, setOpenFaqIndex] = useState(0)
  const [homeServices, setHomeServices] = useState(services)
  const [contactForm, setContactForm] = useState({
    name: '',
    phone: '',
    email: '',
    subject: 'Randevu',
    message: '',
    kvkk: false,
  })

  const handleContactChange = (event) => {
    const { checked, name, type, value } = event.target

    setContactForm((current) => ({
      ...current,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  const handleContactSubmit = (event) => {
    event.preventDefault()

    setContactForm({
      name: '',
      phone: '',
      email: '',
      subject: 'Randevu',
      message: '',
      kvkk: false,
    })
    window.alert('Mesajiniz alindi. En kisa surede size donus yapilacak.')
  }

  useEffect(() => {
    let isMounted = true

    fetch(`${apiBaseUrl}/api/services`)
      .then((response) => {
        if (!response.ok) {
          throw new Error('Hizmetler alinamadi.')
        }

        return response.json()
      })
      .then((data) => {
        if (!isMounted || !Array.isArray(data.services) || data.services.length === 0) {
          return
        }

        const staticMap = new Map(defaultServices.map((service) => [service.id, service]))

        const mappedServices = data.services.map((apiService) => {
          const fallback = staticMap.get(apiService.id)
          return {
            id: apiService.id,
            name: apiService.name || fallback?.name || 'Hizmet',
            price: apiService.price || fallback?.price || '',
            detail:
              apiService.detail ||
              fallback?.detail ||
              (apiService.time ? `${apiService.time} işlem süresi` : 'Özel berber hizmeti'),
          }
        })

        setHomeServices(mappedServices)
      })
      .catch(() => {
        if (isMounted) {
          setHomeServices(defaultServices)
        }
      })

    return () => {
      isMounted = false
    }
  }, [])

  return (
    <main className="home-page" id="top">
      <section className="hero-section">
        <h1 className="mobile-hero-title">
          <span className="hero-name">
            Muhammed
          </span>
          <span className="hero-script">
            Barber
          </span>
        </h1>
        <div className="seo-content">
          <h2>Muhammed Barber Çankırı Merkez Berber</h2>
          <p>
            Muhammed Barber, Çankırı Merkez'de erkek saç kesimi, sakal tıraşı,
            saç şekillendirme, fade kesim, damat bakımı ve online berber randevusu hizmetleri sunar.
          </p>
        </div>
        <picture>
          <source media="(min-width: 641px)" srcSet={theme === 'light' ? '/hero-barber-pc-light.png' : heroImageDesktop} />
          <img className="hero-image" src={theme === 'light' ? '/hero-barber-light.png' : heroImageMobile} alt="Muhammed Barber Çankırı Merkez berber salonu" />
        </picture>

        <div className="mobile-hero-actions">
          <a className="scroll-down-link" href="#next-section" aria-label="Aşağı kaydır">
            <span>Aşağı</span>
            <i />
          </a>

          <div className="hero-cta-card">
            <div>
              <span>Yeni stilin için</span>
              <strong>Yerini ayır.</strong>
            </div>
            <a className="primary-hero-action" href="/randevu" aria-label="Randevu al">
              Randevu Al
              <FaChevronRight aria-hidden="true" />
            </a>
          </div>

          <div className="hero-bottom-row">
            <div className="hero-bottom-actions">
              <a className="secondary-hero-action" href="/randevu-sorgula">
                Randevu Sorgula
              </a>
             
            </div>
            <div className="hero-socials" aria-label="Sosyal medya">
              <a href="https://www.instagram.com/zmamix1/" aria-label="Instagram">
                <FaInstagram />
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="selected-work" aria-labelledby="selected-work-title">
        <div className="selected-work-heading">
          <div>
            <span className="section-kicker">Koltuktan çıkan stiller</span>
            <h2 id="selected-work-title">Detaylar fark yaratır.</h2>
          </div>
          <a href="#galeri">Tüm galeri <FaChevronRight aria-hidden="true" /></a>
        </div>
        <div className="selected-work-grid">
          {[
            { src: '/galery/1.jpg', title: 'Doğal doku', detail: 'Klasik kesim, temiz geçişler', alt: 'Yandan görünen doğal dokulu saç kesimi' },
            { src: '/galery/2.jfif', title: 'Net geçişler', detail: 'Özenle şekillenen bir stil', alt: 'Kısa saçta kademeli fade geçişi' },
            { src: '/galery/3.jfif', title: 'Kişisel dokunuş', detail: 'Tarzını tamamlayan detaylar', alt: 'Ense bölgesinde çizgi tasarımlı saç kesimi' },
          ].map((work) => (
            <a className="selected-work-card" href="#galeri" key={work.src}>
              <div className="selected-work-image">
                <img src={work.src} alt={work.alt} loading="lazy" width="1920" height="2560" />
              </div>
              <div className="selected-work-caption">
                <h3>{work.title}</h3>
                <p>{work.detail}</p>
              </div>
            </a>
          ))}
        </div>
      </section>

      <section className="reviews-section" id="yorumlar">
        <div className="reviews-heading">
          <motion.span
            className="section-kicker"
            initial={{ opacity: 0, y: 22 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.45 }}
            transition={{ duration: 1.05, ease: [0.22, 1, 0.36, 1] }}
          >
            Yorumlar
          </motion.span>
          <motion.h2
            initial={{ opacity: 0, y: 34 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.45 }}
            transition={{ duration: 1.25, delay: 0.22, ease: [0.22, 1, 0.36, 1] }}
          >
            Koltuktan izlenimler.
          </motion.h2>
        </div>

        <div className="selected-reviews">
          {reviews.slice(0, 3).map((review) => (
            <article className="review-card" key={review.name}>
              <span className="review-quote" aria-hidden="true">“</span>
              <p>{review.text}</p>
              <strong>{review.name}</strong>
            </article>
          ))}
        </div>
      </section>

      <section className="about-section" id="next-section">
        <div className="about-content">
          <motion.div className="about-copy" {...revealProps}>
            <span className="section-kicker">Çankırı Merkez</span>
            <h2>Muhammed Barber</h2>
            <p>
              Modern erkek bakimini guclu stil, temiz iscilik ve rahat bir salon
              deneyimiyle bulusturuyoruz.
            </p>
          </motion.div>

          <div className="stats-grid">
            <motion.div className="stat-item" {...revealProps} transition={{ ...revealProps.transition, delay: 0.25 }}>
              <CountUp end={100} suffix="%" />
              <span>Musteri memnuniyeti</span>
            </motion.div>
            <motion.div className="stat-item" {...revealProps} transition={{ ...revealProps.transition, delay: 0.6 }}>
              <CountUp end={5} suffix="+" />
              <span>Yillik deneyim</span>
            </motion.div>
            <motion.div className="stat-item" {...revealProps} transition={{ ...revealProps.transition, delay: 0.95 }}>
              <CountUp end={1} suffix=":1" />
              <span>Profesyonel hizmet</span>
            </motion.div>
          </div>
        </div>
      </section>
      <section className="gallery-section" id="galeri">
        <div className="gallery-copy">
          <motion.span
            className="section-kicker"
            initial={{ opacity: 0, y: 22 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.45 }}
            transition={{ duration: 1.05, ease: [0.22, 1, 0.36, 1] }}
          >
            Galeri
          </motion.span>
          <motion.h2
            initial={{ opacity: 0, y: 34 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.45 }}
            transition={{ duration: 1.25, delay: 0.22, ease: [0.22, 1, 0.36, 1] }}
          >
            Kesimden kalan izler
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 26 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.45 }}
            transition={{ duration: 1.2, delay: 0.48, ease: [0.22, 1, 0.36, 1] }}
          >
            Salon atmosferinden detaylara, sac ve sakal isciligimizin siyah beyaz
            kareleri burada akiyor.
          </motion.p>
        </div>

        <motion.div
          className="gallery-spiral"
          initial={{ opacity: 0, y: 42 }}
          whileInView={{ opacity: 0.72, y: 0 }}
          viewport={{ once: true, amount: 0.18 }}
          transition={{ duration: 1.35, delay: 0.72, ease: [0.22, 1, 0.36, 1] }}
        >
          <InfiniteSpiral
            items={images}
            animationMode="auto"
            speed={0.55}
            radius={170}
            cardWidth={100}
            cardHeight={100}
            verticalSpacing={60}
            perspective={1000}
            cardRadius={10}
            centerScale={1.2}
            edgeBlur={6}
            cardsPerTurn={7}
            pauseOnHover
            direction="up"
            rotation={0}
            cardTilt={0}
            edgeFade={0.3}
            imageFit="cover"
            grayscale={1}
          />
        </motion.div>
      </section>

      <section className="booking-section" id="randevu-al">
        <div className="booking-content">
          <div className="booking-heading">
            <motion.span
              className="section-kicker"
              initial={{ opacity: 0, y: 22 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.45 }}
              transition={{ duration: 1.05, ease: [0.22, 1, 0.36, 1] }}
            >
              Randevu
            </motion.span>
            <motion.h2
              initial={{ opacity: 0, y: 34 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.45 }}
              transition={{ duration: 1.25, delay: 0.22, ease: [0.22, 1, 0.36, 1] }}
            >
              Koltugunu sec, stilini belirle
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 26 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.45 }}
              transition={{ duration: 1.2, delay: 0.44, ease: [0.22, 1, 0.36, 1] }}
            >
              Yapilacak islemi sec, randevu sayfasinda sana uygun zamani tamamla.
            </motion.p>
          </div>

          <div className="service-list">
            {homeServices.map((service, index) => (
              <motion.a
                className="service-card"
                href={`/randevu?service=${encodeURIComponent(service.id || '')}`}
                key={service.id || service.name || index}
                initial={{ opacity: 0, y: 32 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.35 }}
                transition={{
                  duration: 1.15,
                  delay: 0.16 + (index % 8) * 0.12,
                  ease: [0.22, 1, 0.36, 1],
                }}
              >
                <span>{String(index + 1).padStart(2, '0')}</span>
                <div>
                  <strong>{service.name}</strong>
                  <p>{service.detail || 'Özel berber hizmeti'}</p>
                </div>
                <b>{service.price}</b>
                <FaChevronRight aria-hidden="true" />
              </motion.a>
            ))}
          </div>
        </div>
      </section>

      <section className="contact-section" id="iletisim">
        <div className="contact-content">
          <motion.div className="contact-heading" {...revealProps}>
            <h2>Bize ulas</h2>
            <FaPhoneAlt className="contact-phone-mark" aria-hidden="true" />
            <p>
              Bir form doldur, en kisa surede sana donelim.
            </p>
          </motion.div>

          <motion.form
            className="contact-form"
            onSubmit={handleContactSubmit}
            initial={{ opacity: 0, y: 34 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.35 }}
            transition={{ duration: 1.1, delay: 0.18, ease: [0.22, 1, 0.36, 1] }}
          >
            <label>
              <span>Ad*</span>
              <input
                type="text"
                name="name"
                value={contactForm.name}
                onChange={handleContactChange}
                required
              />
            </label>

            <label>
              <span>Telefon*</span>
              <input
                type="tel"
                name="phone"
                value={contactForm.phone}
                onChange={handleContactChange}
                required
              />
            </label>

            <label>
              <span>E-posta*</span>
              <input
                type="email"
                name="email"
                value={contactForm.email}
                onChange={handleContactChange}
                required
              />
            </label>

            <label>
              <span>Konu</span>
              <select name="subject" value={contactForm.subject} onChange={handleContactChange}>
                <option>Randevu</option>
                <option>Fiyat Bilgisi</option>
                <option>Hizmetler</option>
                <option>Diger</option>
              </select>
            </label>

            <label>
              <span>Mesaj</span>
              <textarea
                name="message"
                value={contactForm.message}
                onChange={handleContactChange}
                required
              />
            </label>

            <label className="contact-kvkk">
              <input
                type="checkbox"
                name="kvkk"
                checked={contactForm.kvkk}
                onChange={handleContactChange}
                required
              />
              <span>
                <a href="/kvkk" target="_blank" rel="noreferrer">
                  KVKK Aydınlatma Metni
                </a>
                'ni okudum; bilgilerimin iletisim amaciyla islenmesini onayliyorum.
              </span>
            </label>

            <button type="submit">
              <FaPhoneAlt aria-hidden="true" />
              Gönder
            </button>
          </motion.form>

          <motion.div
            className="contact-map"
            initial={{ opacity: 0, y: 34 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 1.1, delay: 0.28, ease: [0.22, 1, 0.36, 1] }}
          >
            <a
              href="https://yandex.com.tr/maps/org/demirbas_erkek_kuaforu/98280357783/?utm_medium=mapframe&utm_source=maps"
              target="_blank"
              rel="noreferrer"
            >
              Demirbas Erkek Kuaforu
            </a>
            <a
              href="https://yandex.com.tr/maps/103872/cankiri/category/barber_shop/239628851835/?utm_medium=mapframe&utm_source=maps"
              target="_blank"
              rel="noreferrer"
            >
              Çankırı için berberler
            </a>
            <iframe
              src="https://yandex.com.tr/map-widget/v1/org/demirbas_erkek_kuaforu/98280357783/?ll=33.617347%2C40.598715&z=17"
              title="Demirbas Erkek Kuaforu harita"
              loading="lazy"
              allowFullScreen
            />
          </motion.div>
        </div>
      </section>

      <section className="faq-section" id="sss">
        <div className="faq-content">
          <motion.div className="faq-heading" {...revealProps}>
            <span className="section-kicker">SSS</span>
            <h2>Merak edilenler</h2>
          </motion.div>

          <motion.div
            className="faq-list"
            initial={{ opacity: 0, y: 34 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 1.1, delay: 0.16, ease: [0.22, 1, 0.36, 1] }}
          >
            {faqs.map((faq, index) => (
              <div className={`faq-item ${openFaqIndex === index ? 'is-open' : ''}`} key={faq.question}>
                <button
                  className="faq-question"
                  type="button"
                  aria-expanded={openFaqIndex === index}
                  onClick={() => setOpenFaqIndex((current) => (current === index ? -1 : index))}
                >
                  <span>{String(index + 1).padStart(2, '0')}</span>
                  <strong>{faq.question}</strong>
                  <i aria-hidden="true" />
                </button>
                <motion.div
                  className="faq-answer"
                  initial={false}
                  animate={{
                    height: openFaqIndex === index ? 'auto' : 0,
                    opacity: openFaqIndex === index ? 1 : 0,
                  }}
                  transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
                >
                  <p>{faq.answer}</p>
                </motion.div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      <Footer />
    </main>
  )
}

export default Home
