/* ══════════════════════════════════════════════════════
   EXPROVE PASSPORT LIMITED — script.js
   Handles: nav scroll, animations, form, storage, mobile
══════════════════════════════════════════════════════ */

/* ══════════════════════════════════════════════════════
   BACKEND SYNC — sends a copy of every submission to
   /api/submit so the Admin Dashboard can show it from
   ANY device once this site is deployed on Vercel with
   Vercel KV connected. Safe no-op if the API isn't
   reachable (e.g. viewing the file locally) — the form
   still works, still stores to localStorage, still emails.
══════════════════════════════════════════════════════ */
function submitToBackend(record) {
  try {
    fetch('/api/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(record)
    }).catch(() => { /* offline / no backend configured — ignore */ });
  } catch (err) {
    /* fetch not available in this context — ignore */
  }
}

document.addEventListener('DOMContentLoaded', () => {

  /* ── 1. NAVBAR: change style on scroll ── */
  const navbar = document.getElementById('navbar');
  const backToTop = document.getElementById('backToTop');

  window.addEventListener('scroll', () => {
    if (window.scrollY > 60) {
      navbar.classList.add('scrolled');
      backToTop.classList.add('visible');
    } else {
      navbar.classList.remove('scrolled');
      backToTop.classList.remove('visible');
    }
  });

  /* ── 2. BACK TO TOP ── */
  backToTop.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  /* ── 3. MOBILE MENU ── */
  const hamburger = document.getElementById('hamburger');
  const mobileMenu = document.getElementById('mobileMenu');

  hamburger.addEventListener('click', () => {
    mobileMenu.classList.toggle('open');
  });

  /* ── 4. SCROLL REVEAL ANIMATION ── */
  const revealEls = document.querySelectorAll('.reveal, .reveal-left, .reveal-right');

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12 }
  );

  revealEls.forEach(el => observer.observe(el));

  /* ── 5. SMOOTH SCROLL for nav links ── */
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      const target = document.querySelector(this.getAttribute('href'));
      if (target) {
        e.preventDefault();
        const offset = 76; // nav height
        const top = target.getBoundingClientRect().top + window.scrollY - offset;
        window.scrollTo({ top, behavior: 'smooth' });
      }
    });
  });

  /* ── 6. INQUIRY FORM — store & send via EmailJS ── */

  /*
   * ════════════════════════════════════════════════════
   * EMAILJS SETUP — 3 steps (one-time, takes 5 minutes)
   * ════════════════════════════════════════════════════
   *
   * STEP 1 — Create a FREE EmailJS account
   *   → Go to https://www.emailjs.com and sign up (free)
   *
   * STEP 2 — Add your Gmail as an Email Service
   *   → Dashboard → Email Services → Add New Service
   *   → Choose Gmail → connect michaelattaantwi5213@gmail.com
   *   → Copy the Service ID  (looks like: service_xxxxxxx)
   *   → Paste it below as EMAILJS_SERVICE_ID
   *
   * STEP 3 — Create an Email Template
   *   → Dashboard → Email Templates → Create New Template
   *   → Set "To Email" = michaelattaantwi5213@gmail.com
   *   → Paste this as the template body:
   *
   *       New Inquiry from Exprove Website
   *
   *       Name:    {{from_name}}
   *       Email:   {{from_email}}
   *       Phone:   {{phone}}
   *       Service: {{service}}
   *
   *       Message:
   *       {{message}}
   *
   *       Submitted: {{submitted_at}}
   *
   *   → Save the template
   *   → Copy the Template ID (looks like: template_xxxxxxx)
   *   → Paste it below as EMAILJS_TEMPLATE_ID
   *
   * STEP 4 — Get your Public Key
   *   → Dashboard → Account → General → Public Key
   *   → Paste it below as EMAILJS_PUBLIC_KEY
   *
   * ════════════════════════════════════════════════════
   */

  const EMAILJS_SERVICE_ID  = 'service_zce0q0u';   // ← replace with your Service ID
  const EMAILJS_TEMPLATE_ID = 'template_yvy3prj';  // ← replace with your Template ID
  const EMAILJS_PUBLIC_KEY  = 'K00IBRpfMk03CpAxo';   // ← replace with your Public Key

  /* Initialise EmailJS with your public key */
  if (typeof emailjs !== 'undefined') {
    emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY });
  }

  const form = document.getElementById('inquiryForm');
  const formSuccess = document.getElementById('formSuccess');

  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();

      const name    = document.getElementById('fname').value.trim();
      const email   = document.getElementById('femail').value.trim();
      const phone   = document.getElementById('fphone').value.trim();
      const service = document.getElementById('fservice').value;
      const message = document.getElementById('fmsg').value.trim();

      // Basic validation
      if (!name || !email || !service) {
        showNotification('Please fill in your name, email, and service.', 'error');
        return;
      }

      const submittedAt = new Date().toLocaleString('en-GH', { timeZone: 'Africa/Accra' });

      // Store inquiry in localStorage (unchanged — keeps existing storage feature)
      const inquiries = JSON.parse(localStorage.getItem('exprove_inquiries') || '[]');
      const inquiry = {
        id: Date.now(),
        name,
        email,
        phone,
        service,
        message,
        submittedAt
      };
      inquiries.push(inquiry);
      localStorage.setItem('exprove_inquiries', JSON.stringify(inquiries));

      // ── Sync to backend so admin can see it from any device ──
      submitToBackend({
        id: inquiry.id,
        type: 'inquiry',
        service: service,
        amount: 0,
        status: 'free',
        ref: 'INQ-' + inquiry.id,
        submittedAt,
        data: { full_name: name, email, phone, message }
      });

      // ── Send email via EmailJS ──
      const submitBtn = form.querySelector('.form-submit');
      submitBtn.textContent = 'Sending…';
      submitBtn.disabled = true;

      const templateParams = {
        from_name:    name,
        from_email:   email,
        phone:        phone || 'Not provided',
        service:      service,
        message:      message || 'No message provided',
        submitted_at: submittedAt
      };

      if (typeof emailjs !== 'undefined' &&
          EMAILJS_SERVICE_ID  !== 'YOUR_SERVICE_ID' &&
          EMAILJS_TEMPLATE_ID !== 'YOUR_TEMPLATE_ID') {

        emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, templateParams)
          .then(() => {
            // Email sent successfully
            form.style.display = 'none';
            formSuccess.style.display = 'block';
            setTimeout(() => {
              form.reset();
              form.style.display = 'block';
              formSuccess.style.display = 'none';
              submitBtn.textContent = 'Send Message';
              submitBtn.disabled = false;
            }, 6000);
            showNotification(`Thank you, ${name}! We'll be in touch within 24 hours.`, 'success');
          })
          .catch((err) => {
            console.error('EmailJS error:', err);
            submitBtn.textContent = 'Send Message';
            submitBtn.disabled = false;
            showNotification('Message stored. Email sending failed — please contact us directly.', 'error');
            // Still show success since it was stored locally
            form.style.display = 'none';
            formSuccess.style.display = 'block';
            setTimeout(() => {
              form.reset();
              form.style.display = 'block';
              formSuccess.style.display = 'none';
            }, 6000);
          });

      } else {
        // EmailJS not configured yet — still save locally and show success
        submitBtn.textContent = 'Send Message';
        submitBtn.disabled = false;
        form.style.display = 'none';
        formSuccess.style.display = 'block';
        setTimeout(() => {
          form.reset();
          form.style.display = 'block';
          formSuccess.style.display = 'none';
        }, 6000);
        showNotification(`Thank you, ${name}! We'll be in touch within 24 hours.`, 'success');
      }
    });
  }

  /* ── 7. NOTIFICATION TOAST ── */
  function showNotification(message, type = 'success') {
    // Remove existing
    const existing = document.querySelector('.exprove-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'exprove-toast';
    toast.innerHTML = `
      <span class="toast-icon">${type === 'success' ? '✓' : '!'}</span>
      <span>${message}</span>
    `;

    toast.style.cssText = `
      position: fixed;
      bottom: 32px;
      left: 50%;
      transform: translateX(-50%) translateY(80px);
      background: ${type === 'success' ? '#1a5c2a' : '#c0392b'};
      color: white;
      padding: 14px 28px;
      border-radius: 50px;
      font-family: 'Outfit', sans-serif;
      font-size: 0.9rem;
      font-weight: 500;
      box-shadow: 0 8px 40px rgba(0,0,0,0.25);
      z-index: 9999;
      display: flex;
      align-items: center;
      gap: 10px;
      transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.4s ease;
      max-width: 90vw;
      text-align: center;
    `;

    const icon = toast.querySelector('.toast-icon');
    icon.style.cssText = `
      width: 22px;
      height: 22px;
      background: rgba(255,255,255,0.2);
      border-radius: 50%;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 0.75rem;
      font-weight: 800;
      flex-shrink: 0;
    `;

    document.body.appendChild(toast);

    // Animate in
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        toast.style.transform = 'translateX(-50%) translateY(0)';
      });
    });

    // Remove after 5 seconds
    setTimeout(() => {
      toast.style.transform = 'translateX(-50%) translateY(80px)';
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 400);
    }, 5000);
  }

  /* ── 8. GALLERY LIGHTBOX ── */
  const galleryItems = document.querySelectorAll('.gallery-item');

  galleryItems.forEach(item => {
    item.addEventListener('click', () => {
      const img = item.querySelector('img');
      const caption = item.querySelector('.gallery-caption')?.textContent || '';

      const overlay = document.createElement('div');
      overlay.className = 'lightbox-overlay';
      overlay.style.cssText = `
        position: fixed;
        inset: 0;
        background: rgba(0,0,0,0.92);
        z-index: 9998;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-direction: column;
        gap: 16px;
        cursor: pointer;
        animation: fadeIn 0.3s ease;
      `;

      const lightboxImg = document.createElement('img');
      lightboxImg.src = img.src;
      lightboxImg.alt = img.alt;
      lightboxImg.style.cssText = `
        max-width: 90vw;
        max-height: 80vh;
        object-fit: contain;
        border-radius: 12px;
        box-shadow: 0 20px 80px rgba(0,0,0,0.5);
      `;

      const lightboxCaption = document.createElement('p');
      lightboxCaption.textContent = caption;
      lightboxCaption.style.cssText = `
        color: rgba(255,255,255,0.7);
        font-family: 'Outfit', sans-serif;
        font-size: 0.9rem;
        font-weight: 300;
        letter-spacing: 0.5px;
      `;

      const closeBtn = document.createElement('button');
      closeBtn.innerHTML = '✕';
      closeBtn.style.cssText = `
        position: absolute;
        top: 24px;
        right: 24px;
        background: rgba(255,255,255,0.1);
        border: none;
        color: white;
        width: 44px;
        height: 44px;
        border-radius: 50%;
        font-size: 1.1rem;
        cursor: pointer;
        transition: background 0.2s;
      `;
      closeBtn.onmouseover = () => closeBtn.style.background = 'rgba(255,255,255,0.2)';
      closeBtn.onmouseout  = () => closeBtn.style.background = 'rgba(255,255,255,0.1)';

      overlay.appendChild(lightboxImg);
      overlay.appendChild(lightboxCaption);
      overlay.appendChild(closeBtn);
      document.body.appendChild(overlay);

      const close = () => overlay.remove();
      overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
      closeBtn.addEventListener('click', close);
      document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); }, { once: true });
    });
  });

  /* ── 9. ANIMATED COUNTER for hero stats ── */
  function animateCounter(el, target, suffix = '') {
    let start = 0;
    const duration = 2000;
    const step = target / (duration / 16);
    const counter = setInterval(() => {
      start += step;
      if (start >= target) {
        el.textContent = target + suffix;
        clearInterval(counter);
      } else {
        el.textContent = Math.floor(start) + suffix;
      }
    }, 16);
  }

  const heroStats = document.querySelector('.hero-stats');
  if (heroStats) {
    const statsObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const stats = entry.target.querySelectorAll('.stat strong');
            stats.forEach(stat => {
              const text = stat.textContent;
              if (text.includes('+')) animateCounter(stat, parseInt(text), '+');
              else if (text.includes('%')) animateCounter(stat, parseInt(text), '%');
            });
            statsObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.5 }
    );
    statsObserver.observe(heroStats);
  }

  /* ── 10. ACTIVE NAV LINK on scroll ── */
  const sections = document.querySelectorAll('section[id]');
  const navLinks = document.querySelectorAll('.nav-links a, .mobile-menu a');

  window.addEventListener('scroll', () => {
    let current = '';
    sections.forEach(section => {
      const sectionTop = section.offsetTop - 120;
      if (window.scrollY >= sectionTop) {
        current = section.getAttribute('id');
      }
    });

    navLinks.forEach(link => {
      link.classList.remove('active-nav');
      if (link.getAttribute('href') === `#${current}`) {
        link.classList.add('active-nav');
      }
    });
  });

  /* ── 11. LOG stored inquiries count ── */
  const stored = JSON.parse(localStorage.getItem('exprove_inquiries') || '[]');
  if (stored.length > 0) {
    console.log(`📬 Exprove: ${stored.length} inquiry/inquiries stored locally.`);
  }

});

/* ── Global: close mobile menu ── */
function closeMobile() {
  document.getElementById('mobileMenu').classList.remove('open');
}


/* ══════════════════════════════════════════════════════
   SERVICE FORMS — Paystack Payment + EmailJS Submission
══════════════════════════════════════════════════════ */

// ── Paystack Configuration ──
// ⚠️ REPLACE THIS with your actual Paystack Public Key from dashboard.paystack.com
const PAYSTACK_PUBLIC_KEY = 'pk_test_f95022e3fc5f04319bc812082a3f953317052aec';

const EMAILJS_SERVICE_ID_SVC  = 'service_zce0q0u';
const EMAILJS_TEMPLATE_ID_SVC = 'template_yvy3prj';

// ── Service Form Handler ──
function handleServiceForm(formElement, serviceName, amountGHS) {
  const submitBtn = formElement.querySelector('#submitBtn');
  const successDiv = document.getElementById('formSuccess');
  const errorDiv = document.getElementById('formError');
  const errorText = document.getElementById('errorText');

  // ── If this form has a service-tier picker, the selected tier
  //    overrides both the service label and the amount charged ──
  const tierChecked = formElement.querySelector('input[name="service_tier"]:checked');
  if (tierChecked) {
    const tierPrice = parseFloat(tierChecked.dataset.price);
    if (!isNaN(tierPrice)) amountGHS = tierPrice;
    if (tierChecked.dataset.label) serviceName = serviceName + ' — ' + tierChecked.dataset.label;
  } else if (formElement.querySelector('input[name="service_tier"]')) {
    // Tier picker exists but nothing selected yet
    showNotification('Please select a processing option before paying.', 'error');
    return;
  }

  // Honeypot check
  const honeypot = formElement.querySelector('input[name="website"]');
  if (honeypot && honeypot.value.length > 0) {
    showNotification('Spam detected. Please try again.', 'error');
    return;
  }

  // Collect form data
  const formData = new FormData(formElement);
  const data = {};
  formData.forEach((value, key) => {
    if (key !== 'website') data[key] = value;
  });

  // Basic validation
  const email = data.email || '';
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    showNotification('Please enter a valid email address.', 'error');
    return;
  }

  // Build details string for email
  let detailsText = '';
  for (const [key, value] of Object.entries(data)) {
    if (!value) continue;
    const label = key.replace(/_/g, ' ').replace(/\w/g, l => l.toUpperCase());
    detailsText += `${label}: ${value}\n`;
  }

  // Format amount for Paystack (in pesewas)
  const amountPesewas = amountGHS * 100;

  // Generate reference
  const reference = 'EXP_' + Date.now() + '_' + Math.floor(Math.random() * 1000);

  // Disable button
  submitBtn.disabled = true;
  submitBtn.textContent = 'Processing…';

  // Initialize Paystack
  if (typeof PaystackPop === 'undefined') {
    showNotification('Payment system not loaded. Please refresh the page.', 'error');
    submitBtn.disabled = false;
    submitBtn.innerHTML = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg> Proceed to Payment`;
    return;
  }

  const nameGuess = data.full_name || data.surname || data.owner_name || data.company_name_1 || data.applicant_name || data.first_owner_name || 'N/A';

  const handler = PaystackPop.setup({
    key: PAYSTACK_PUBLIC_KEY,
    email: email,
    amount: amountPesewas,
    currency: 'GHS',
    ref: reference,
    metadata: {
      service: serviceName,
      custom_fields: [
        { display_name: "Service", variable_name: "service", value: serviceName },
        { display_name: "Customer Name", variable_name: "customer_name", value: nameGuess },
        { display_name: "Phone", variable_name: "phone", value: data.phone || 'N/A' }
      ]
    },
    callback: function(response) {
      // Payment successful — send email
      const submittedAt = new Date().toLocaleString('en-GH', { timeZone: 'Africa/Accra' });

      // Store in localStorage
      const applications = JSON.parse(localStorage.getItem('exprove_applications') || '[]');
      const record = {
        id: reference,
        service: serviceName,
        amount: amountGHS,
        payment_ref: response.reference,
        data: data,
        submittedAt: submittedAt
      };
      applications.push(record);
      localStorage.setItem('exprove_applications', JSON.stringify(applications));

      // ── Sync to backend so admin can see it from any device ──
      submitToBackend({
        id: reference,
        type: 'application',
        service: serviceName,
        amount: amountGHS,
        status: 'paid',
        ref: response.reference,
        submittedAt,
        data: data
      });

      // Send via EmailJS
      const templateParams = {
        service_type: serviceName,
        from_name: nameGuess,
        from_email: email,
        phone: data.phone || 'N/A',
        details: detailsText,
        amount: amountGHS,
        payment_ref: response.reference,
        payment_status: 'PAID',
        submitted_at: submittedAt
      };

      if (typeof emailjs !== 'undefined') {
        emailjs.send(EMAILJS_SERVICE_ID_SVC, EMAILJS_TEMPLATE_ID_SVC, templateParams)
          .then(() => {
            formElement.style.display = 'none';
            successDiv.classList.add('show');
            showNotification(`Payment successful! Your ${serviceName} has been submitted.`, 'success');
          })
          .catch((err) => {
            console.error('EmailJS error:', err);
            formElement.style.display = 'none';
            successDiv.classList.add('show');
            showNotification('Payment successful! We will contact you shortly.', 'success');
          });
      } else {
        formElement.style.display = 'none';
        successDiv.classList.add('show');
        showNotification('Payment successful! We will contact you shortly.', 'success');
      }
    },
    onClose: function() {
      submitBtn.disabled = false;
      submitBtn.innerHTML = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg> Proceed to Payment`;
      showNotification('Payment window closed. You can try again when ready.', 'error');
    }
  });

  handler.openIframe();
}

/* ── LOG stored applications count ── */
const storedApps = JSON.parse(localStorage.getItem('exprove_applications') || '[]');
if (storedApps.length > 0) {
  console.log(`📋 Exprove: ${storedApps.length} application(s) stored locally.`);
}

/* ══════════════════════════════════════════════════════
   TIER PICKER — live price summary
   Call bindTierPricing('radioGroupName', 'summaryElId')
   on any page that has a .tier-grid of radio inputs.
══════════════════════════════════════════════════════ */
function bindTierPricing(radioName, summaryElId) {
  const radios = document.querySelectorAll(`input[name="${radioName}"]`);
  const summaryEl = document.getElementById(summaryElId);
  if (!radios.length || !summaryEl) return;

  function update() {
    const checked = document.querySelector(`input[name="${radioName}"]:checked`);
    if (checked) {
      const price = parseFloat(checked.dataset.price) || 0;
      summaryEl.querySelector('.amount').textContent = 'GHS ' + price.toLocaleString() + '.00';
      summaryEl.style.display = 'flex';
    } else {
      summaryEl.style.display = 'none';
    }
  }
  radios.forEach(r => r.addEventListener('change', update));
  update();
}

/* ══════════════════════════════════════════════════════
   PHOTO PREVIEW — client-side only.
   The selected photo is shown as a preview so the applicant
   can confirm it looks right, but it is NOT uploaded to our
   server or included in the submission — applicants are asked
   to send the actual photo file via WhatsApp/email afterward.
══════════════════════════════════════════════════════ */
function bindPhotoPreview(inputId, circleId) {
  const input = document.getElementById(inputId);
  const circle = document.getElementById(circleId);
  if (!input || !circle) return;

  input.addEventListener('change', () => {
    const file = input.files && input.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      showNotification('Photo is larger than 5MB — please choose a smaller file.', 'error');
      input.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      circle.innerHTML = `<img src="${e.target.result}" alt="Selected photo preview"/>`;
    };
    reader.readAsDataURL(file);
  });
}

/* ── Generic document preview (Ghana Card / Birth Certificate) ──
   Works for images (shows a thumbnail) and PDFs/other files
   (shows a filename chip). Also client-side only — not uploaded. */
function bindFilePreview(inputId, previewId) {
  const input = document.getElementById(inputId);
  const preview = document.getElementById(previewId);
  if (!input || !preview) return;

  input.addEventListener('change', () => {
    const file = input.files && input.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      showNotification('File is larger than 5MB — please choose a smaller file.', 'error');
      input.value = '';
      return;
    }
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        preview.innerHTML = `<img src="${e.target.result}" alt="Selected document preview"/>`;
      };
      reader.readAsDataURL(file);
    } else {
      const safeName = document.createElement('div');
      safeName.textContent = file.name;
      preview.innerHTML = `<span class="doc-file-chip">📄 ${safeName.innerHTML}</span>`;
    }
  });
}
