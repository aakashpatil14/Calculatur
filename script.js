// Restored functionality with GST support; percentage display under installments removed.

(() => {
  const STUDY = 5000;

  // Elements
  const totalFeeEl = document.getElementById("totalFee");        // course fee
  const gstPctEl = document.getElementById("gstPct");            // gst %
  const totalWithGstWrapper = document.getElementById("totalWithGstWrapper");
  const totalWithGstEl = document.getElementById("totalWithGst"); // readonly display
  const regFeeEl = document.getElementById("regFee");

  const editPctBtn = document.getElementById("editPctBtn");
  const calculateBtn = document.getElementById("calculateBtn");
  const resetBtn = document.getElementById("resetBtn");

  const percentEditor = document.getElementById("percentEditor");
  const p1El = document.getElementById("p1");
  const p2El = document.getElementById("p2");
  const p3El = document.getElementById("p3");
  const savePctBtn = document.getElementById("savePctBtn");
  const cancelPctBtn = document.getElementById("cancelPctBtn");

  const errorEl = document.getElementById("error");

  const inst1El = document.getElementById("inst1");
  const inst2El = document.getElementById("inst2");
  const inst3El = document.getElementById("inst3");

  // State: default percentages
  let percentages = { p1: 46, p2: 37, p3: 17 };

  // Format helper
  const formatter = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 });
  function formatAmt(v){ return formatter.format(v); }
  function safeNum(v){ const n = Number(v); return Number.isFinite(n) ? n : NaN; }

  // UI helpers
  function showError(msg){
    errorEl.textContent = msg || "";
    if (msg) {
      inst1El.textContent = inst2El.textContent = inst3El.textContent = "—";
    }
  }
  function clearError(){ showError(""); }

  // Update total-with-gst display value
  // Always show Total Fee box; if GST = 0 it shows Course Fee
  function updateTotalWithGst(){
    const course = safeNum(totalFeeEl.value);
    const gstPct = safeNum(gstPctEl.value);

    // ensure wrapper visible
    totalWithGstWrapper.classList.remove("hidden");

    if (!Number.isFinite(gstPct) || !Number.isFinite(course)) {
      totalWithGstEl.value = "";
      return;
    }

    if (gstPct > 0) {
      const gstAmount = +(course * (gstPct / 100));
      const gross = +(course + gstAmount);
      totalWithGstEl.value = formatAmt(gross);
    } else {
      totalWithGstEl.value = formatAmt(course);
    }
  }

  // Open / close percent editor
  function openPercentEditor(){
    p1El.value = percentages.p1;
    p2El.value = percentages.p2;
    p3El.value = percentages.p3;
    percentEditor.style.display = "block";
    p1El.focus();
  }
  function closePercentEditor(){
    percentEditor.style.display = "none";
  }

  // Save percentages (validate sum = 100)
  function savePercentages(){
    const p1 = safeNum(p1El.value);
    const p2 = safeNum(p2El.value);
    const p3 = safeNum(p3El.value);

    if (!Number.isFinite(p1) || !Number.isFinite(p2) || !Number.isFinite(p3)) {
      alert("Enter valid numeric percentages for all three fields.");
      return;
    }
    const sum = +(p1 + p2 + p3);
    if (Math.abs(sum - 100) > 0.0001) {
      alert(`Percentages must sum to 100 (currently ${sum.toFixed(2)}).`);
      return;
    }

    // If total & reg present, check p1 covers STUDY
    const course = safeNum(totalFeeEl.value);
    const gstPct = safeNum(gstPctEl.value);
    const reg = safeNum(regFeeEl.value);
    if (Number.isFinite(course) && Number.isFinite(gstPct) && Number.isFinite(reg)) {
      const gross = +(course + (course * gstPct / 100));
      const remaining = +(gross - reg);
      if (remaining <= 0) {
        alert("Registration must be less than total fee to validate percentages.");
        return;
      }
      const a1 = remaining * (p1 / 100);
      if (a1 + 1e-9 < STUDY) {
        const minPct = (STUDY / remaining) * 100;
        alert(`With current fees, 1st% must be at least ${minPct.toFixed(2)}% to include ₹${STUDY.toLocaleString('en-IN')}.`);
        return;
      }
    }

    percentages = { p1, p2, p3 };
    closePercentEditor();
    clearError();
  }

  // Main calculation (uses percentages of Remaining = (Course + GST) - Registration)
  function calculate(){
    clearError();
    const course = safeNum(totalFeeEl.value);
    const gstPct = safeNum(gstPctEl.value);
    const reg = safeNum(regFeeEl.value);

    if (!Number.isFinite(course) || !Number.isFinite(gstPct) || !Number.isFinite(reg)) {
      showError("Please enter numeric Course Fee, GST% and Registration Fee.");
      return;
    }
    if (course <= 0 || gstPct < 0 || reg < 0) {
      showError("Fee values must be positive.");
      return;
    }

    const gross = +(course + (course * gstPct / 100));
    const remaining = +(gross - reg);

    if (remaining <= 0) {
      showError("No remaining amount for installments.");
      return;
    }

    // validate percentages
    const p1 = Number(percentages.p1);
    const p2 = Number(percentages.p2);
    const p3 = Number(percentages.p3);
    const sumP = +(p1 + p2 + p3);
    if (Math.abs(sumP - 100) > 0.0001) {
      showError(`Percentages must sum to 100 (currently ${sumP.toFixed(2)}). Use Edit Percentages to fix.`);
      return;
    }

    // compute per-percentage allocations
    let a1 = +(remaining * (p1 / 100));
    let a2 = +(remaining * (p2 / 100));
    let a3 = +(remaining * (p3 / 100));

    // rounding fix so totals equal remaining
    const roundingDiff = +(remaining - (a1 + a2 + a3));
    if (Math.abs(roundingDiff) >= 0.0001) {
      const maxIndex = [p1, p2, p3].indexOf(Math.max(p1, p2, p3));
      if (maxIndex === 0) a1 += roundingDiff;
      else if (maxIndex === 1) a2 += roundingDiff;
      else a3 += roundingDiff;
    }

    // Ensure first includes STUDY
    if (a1 + 1e-9 < STUDY) {
      const minPct = (STUDY / remaining) * 100;
      showError(`1st percentage too small to include ₹${STUDY.toLocaleString('en-IN')}. Minimum required ${minPct.toFixed(2)}%.`);
      return;
    }

    // Display
    inst1El.textContent = formatAmt(a1);
    inst2El.textContent = formatAmt(a2);
    inst3El.textContent = formatAmt(a3);
  }

  function resetAll(){
    totalFeeEl.value = "";
    gstPctEl.value = "0";
    totalWithGstEl.value = "";
    // totalWithGstWrapper remains visible and will show course when set
    regFeeEl.value = "";
    percentages = { p1: 46, p2: 37, p3: 17 };
    inst1El.textContent = "—";
    inst2El.textContent = "—";
    inst3El.textContent = "—";
    clearError();
    closePercentEditor();
  }

  // Event bindings
  editPctBtn.addEventListener("click", openPercentEditor);
  savePctBtn.addEventListener("click", savePercentages);
  cancelPctBtn.addEventListener("click", closePercentEditor);
  calculateBtn.addEventListener("click", () => {
    updateTotalWithGst();
    calculate();
  });
  resetBtn.addEventListener("click", resetAll);

  // Auto update total-with-gst display when course or gst change
  [totalFeeEl, gstPctEl].forEach(el => el.addEventListener("input", updateTotalWithGst));

  // Initialize default editor values (hidden)
  (function init(){
    p1El.value = percentages.p1;
    p2El.value = percentages.p2;
    p3El.value = percentages.p3;
    percentEditor.style.display = "none";
    // show total-with-gst wrapper by default (will display course if GST=0)
    totalWithGstWrapper.classList.remove("hidden");
    totalWithGstEl.value = "";
    inst1El.textContent = inst2El.textContent = inst3El.textContent = "—";
  })();
})();