// src/components/LineaTemporalAccidente.jsx
import React, { useEffect, useRef } from "react";

const AZUL = "#0f2f4b";

export default function LineaTemporalAccidente() {
  const initializedRef = useRef(false);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    // ================== Utilidades ==================
    const azul = "#0f2f4b",
      amber = "#f59e0b",
      MS_PER_DAY = 86400000;
    const toDate = (s) => (s ? new Date(s + "T00:00:00") : null);
    const ymd = (d) => (d ? d.toISOString().slice(0, 10) : "");
    const addDaysStr = (s, n) => {
      const d = toDate(s);
      if (!d) return "";
      d.setDate(d.getDate() + n);
      return ymd(d);
    };
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    const roundToDay = (ms) => Math.round(ms / MS_PER_DAY) * MS_PER_DAY;
    function fmtDMY(s) {
      if (!s) return "—";
      const [y, m, d] = s.split("-");
      return `${d}/${m}/${y}`;
    }
    function parseAnyDate(str) {
      if (!str) return null;
      let s = str.trim();
      let m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
      if (m) {
        const dd = m[1].padStart(2, "0"),
          mm = m[2].padStart(2, "0"),
          yyyy = m[3];
        const d = new Date(`${yyyy}-${mm}-${dd}T00:00:00`);
        return isNaN(d) ? null : d;
      }
      m = s.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
      if (m) {
        const yyyy = m[1],
          mm = m[2].padStart(2, "0"),
          dd = m[3].padStart(2, "0");
        const d = new Date(`${yyyy}-${mm}-${dd}T00:00:00`);
        return isNaN(d) ? null : d;
      }
      return null;
    }

    // ================== 1) Estado (con ejemplos) ==================
    let state = {
      accidente: "2024-06-15",
      cm: "2024-10-15",
      noti: "2024-11-15",
      modoMin: "accidente", // o 'liquidacion'
    };

    // ================== 2) Buscador de Resoluciones ==================
    const resolucionesURL = {
      "Res. 34-2013":
        "https://0782884a-273c-435e-8cd9-861a08a2095b.usrfiles.com/ugd/078288_918fd253db9a4186b0d62255f22ee019.pdf",
      "Res. 3-2014":
        "https://0782884a-273c-435e-8cd9-861a08a2095b.usrfiles.com/ugd/078288_9ee55eeb7c5148c9824ccef9cb4692e2.pdf",
      "Res. 22-2014":
        "https://0782884a-273c-435e-8cd9-861a08a2095b.usrfiles.com/ugd/078288_86501fa248b1407290b2c293e69cc2a6.pdf",
      "Res. 6-2015":
        "https://0782884a-273c-435e-8cd9-861a08a2095b.usrfiles.com/ugd/078288_e7ca81607fbe429780bce621ba3149b8.pdf",
      "Res. 28-2015":
        "https://0782884a-273c-435e-8cd9-861a08a2095b.usrfiles.com/ugd/078288_70d04b7b200f4321a26ab3f7eaedeba1.pdf",
      "Res. 1-2016":
        "https://0782884a-273c-435e-8cd9-861a08a2095b.usrfiles.com/ugd/078288_95ba067e50834860994ee3d09fe133d0.pdf",
      "Res. 387-E-2016":
        "https://0782884a-273c-435e-8cd9-861a08a2095b.usrfiles.com/ugd/078288_0341320d108845a193c6e67198277eb1.pdf",
      "S.R.T. Nota S.C.E. 5619-17":
        "https://0782884a-273c-435e-8cd9-861a08a2095b.usrfiles.com/ugd/078288_7444509788bc42c4a92a9635aeb0e140.pdf",
      "S.R.T. Nota S.C.E. 21161-17":
        "https://0782884a-273c-435e-8cd9-861a08a2095b.usrfiles.com/ugd/078288_df29a5ccb0644854bf4c2f35b68aea5d.pdf",
      "S.R.T. Nota S.C.E. 6026-18":
        "https://0782884a-273c-435e-8cd9-861a08a2095b.usrfiles.com/ugd/078288_c6e6c7419c344c4084107d4c3638ab85.pdf",
      "S.R.T. Nota G.C.P. 18437-18":
        "https://0782884a-273c-435e-8cd9-861a08a2095b.usrfiles.com/ugd/078288_9c788fd597ca46ff9e00742bbde1f6f2.pdf",
      "S.R.T. Nota G.C.P. 2727-19":
        "https://0782884a-273c-435e-8cd9-861a08a2095b.usrfiles.com/ugd/078288_115bbc70b6c54421b0206919a888a183.pdf",
      "S.R.T. Nota S.C.E. 76715123/19":
        "https://0782884a-273c-435e-8cd9-861a08a2095b.usrfiles.com/ugd/078288_dc980861a78d4d51a023410a593810ca.pdf",
      "S.R.T. Res. 24-2020":
        "https://0782884a-273c-435e-8cd9-861a08a2095b.usrfiles.com/ugd/078288_32d89cd950024238bcaf9d9649331308.pdf",
      "S.R.T. Res. 70-2020":
        "https://0782884a-273c-435e-8cd9-861a08a2095b.usrfiles.com/ugd/078288_2c424668e8014599aa243199e49fd8d4.pdf",
      "Res. 7-2021":
        "https://0782884a-273c-435e-8cd9-861a08a2095b.usrfiles.com/ugd/078288_59c05a206aea4960be0baf60007fed12.pdf",
      "Res. 49-2021":
        "https://0782884a-273c-435e-8cd9-861a08a2095b.usrfiles.com/ugd/078288_804b96b1db254ca89ee756886779ef52.pdf",
      "Res. 15-2022":
        "https://0782884a-273c-435e-8cd9-861a08a2095b.usrfiles.com/ugd/078288_bd1b7b7a2ca24826af9c6edde5672b60.pdf",
      "Res. 51-2022":
        "https://0782884a-273c-435e-8cd9-861a08a2095b.usrfiles.com/ugd/078288_cf77611e8cfb467bbdaa3b4797b3a337.pdf",
      "Res. 12-2023":
        "https://0782884a-273c-435e-8cd9-861a08a2095b.usrfiles.com/ugd/078288_c313d0bf04de44d2aa9ddc3aedea7ce0.pdf",
      "Res. 39-2023":
        "https://0782884a-273c-435e-8cd9-861a08a2095b.usrfiles.com/ugd/078288_6ecbce2045a149fcb6dd92ccc068123c.pdf",
      "Res. 18-2024":
        "https://0782884a-273c-435e-8cd9-861a08a2095b.usrfiles.com/ugd/078288_cfb99db0fe074dad8f6389a13959068f.pdf",
      "Res. 55-2024":
        "https://0782884a-273c-435e-8cd9-861a08a2095b.usrfiles.com/ugd/078288_e26897a7771647e682235fedc46c161a.pdf",
      "Res. 9-2025":
        "https://0782884a-273c-435e-8cd9-861a08a2095b.usrfiles.com/ugd/078288_a714233479f948788091941df2006deb.pdf",
      "Res. 37-2025":
        "https://0782884a-273c-435e-8cd9-861a08a2095b.usrfiles.com/ugd/078288_98960caf23c24d759e990be580fcc772.pdf",
    };

    const listaResoluciones = [
      { res: "Res. 34-2013", desde: "2012-10-26", hasta: "2013-02-28" },
      { res: "Res. 34-2013", desde: "2013-03-01", hasta: "2013-08-31" },
      { res: "Res. 34-2013", desde: "2013-09-01", hasta: "2014-02-28" },
      { res: "Res. 3-2014", desde: "2014-03-01", hasta: "2014-08-31" },
      { res: "Res. 22-2014", desde: "2014-09-01", hasta: "2015-02-28" },
      { res: "Res. 6-2015", desde: "2015-03-01", hasta: "2015-08-31" },
      { res: "Res. 28-2015", desde: "2015-09-01", hasta: "2016-02-29" },
      { res: "Res. 1-2016", desde: "2016-03-01", hasta: "2016-08-31" },
      { res: "Res. 387-E-2016", desde: "2016-09-01", hasta: "2017-02-28" },
      {
        res: "S.R.T. Nota S.C.E. 5619-17",
        desde: "2017-03-01",
        hasta: "2017-08-31",
      },
      {
        res: "S.R.T. Nota S.C.E. 21161-17",
        desde: "2017-09-01",
        hasta: "2018-02-28",
      },
      {
        res: "S.R.T. Nota S.C.E. 6026-18",
        desde: "2018-03-01",
        hasta: "2018-08-31",
      },
      {
        res: "S.R.T. Nota G.C.P. 18437-18",
        desde: "2018-09-01",
        hasta: "2019-02-28",
      },
      {
        res: "S.R.T. Nota G.C.P. 2727-19",
        desde: "2019-03-01",
        hasta: "2019-08-31",
      },
      {
        res: "S.R.T. Nota S.C.E. 76715123/19",
        desde: "2019-09-01",
        hasta: "2020-02-29",
      },
      {
        res: "S.R.T. Res. 24-2020",
        desde: "2020-03-01",
        hasta: "2020-08-31",
      },
      {
        res: "S.R.T. Res. 70-2020",
        desde: "2020-09-01",
        hasta: "2021-02-28",
      },
      { res: "Res. 7-2021", desde: "2021-03-01", hasta: "2021-08-31" },
      { res: "Res. 49-2021", desde: "2021-09-01", hasta: "2022-02-28" },
      { res: "Res. 15-2022", desde: "2022-03-01", hasta: "2022-08-31" },
      { res: "Res. 51-2022", desde: "2022-09-01", hasta: "2023-02-28" },
      { res: "Res. 12-2023", desde: "2023-03-01", hasta: "2023-08-31" },
      { res: "Res. 39-2023", desde: "2023-09-01", hasta: "2024-02-29" },
      { res: "Res. 18-2024", desde: "2024-03-01", hasta: "2024-08-31" },
      { res: "Res. 55-2024", desde: "2024-09-01", hasta: "2025-02-28" },
      { res: "Res. 9-2025", desde: "2025-03-01", hasta: "2025-08-31" },
      { res: "Res. 37-2025", desde: "2025-09-01", hasta: "2026-02-28" },
    ];

    function findResolucion(dateStr) {
      const d = toDate(dateStr);
      if (!d) return null;
      for (const r of listaResoluciones) {
        const ds = toDate(r.desde),
          hs = toDate(r.hasta);
        if (d >= ds && d <= hs) {
          return { res: r.res, url: resolucionesURL[r.res] || null };
        }
      }
      return null;
    }

    // ================== 3) Interfaz ==================
    const timelineWrap = document.getElementById("timelineWrap");
    const warnAcc = document.getElementById("warnAccidente");
    const btnMinLiq = document.getElementById("btnMinLiquidacion");
    const btnMinAcc = document.getElementById("btnMinAccidente");

    btnMinLiq.addEventListener("click", () => {
      state.modoMin = "liquidacion";
      btnMinLiq.classList.add("bg-white", "shadow", "text-gray-900");
      btnMinLiq.setAttribute("aria-pressed", "true");
      btnMinAcc.classList.remove("bg-white", "shadow", "text-gray-900");
      btnMinAcc.setAttribute("aria-pressed", "false");
      warnAcc.classList.add("hidden");
      render();
    });
    btnMinAcc.addEventListener("click", () => {
      state.modoMin = "accidente";
      btnMinAcc.classList.add("bg-white", "shadow", "text-gray-900");
      btnMinAcc.setAttribute("aria-pressed", "true");
      btnMinLiq.classList.remove("bg-white", "shadow", "text-gray-900");
      btnMinLiq.setAttribute("aria-pressed", "false");
      warnAcc.classList.remove("hidden");
      render();
    });

    function getEvents() {
      const liq = addDaysStr(state.noti, 15);
      const min = state.modoMin === "liquidacion" ? liq : state.accidente;
      return [
        {
          key: "accidente",
          label: "Accidente / PMI",
          dateStr: state.accidente,
          draggable: true,
          editable: true,
        },
        {
          key: "cm",
          label: "Dictamen CM",
          dateStr: state.cm,
          draggable: true,
          editable: true,
        },
        {
          key: "noti",
          label: "Notificación dictamen",
          dateStr: state.noti,
          draggable: true,
          editable: true,
        },
        {
          key: "liq",
          label: "Liquidación (+15 días)",
          dateStr: liq,
          draggable: false,
          editable: false,
          derived: true,
        },
        {
          key: "min",
          label: "Resolución mínimos",
          dateStr: min,
          draggable: false,
          editable: false,
          special: true,
        },
      ].filter((e) => !!e.dateStr);
    }

    const DISPLAY_SHIFT_DAYS = 15;
    function timeForDisplay(e) {
      const t = toDate(e.dateStr)?.getTime() || 0;
      if (e.key === "liq") return t + DISPLAY_SHIFT_DAYS * MS_PER_DAY;
      if (e.key === "min" && state.modoMin === "liquidacion")
        return t + DISPLAY_SHIFT_DAYS * MS_PER_DAY;
      return t;
    }

    function render() {
      const events = getEvents();
      if (events.length < 2) {
        timelineWrap.innerHTML = `<div class="text-xs text-gray-500 border rounded-xl p-3 bg-gray-50">
          Cargá o arrastrá fechas para visualizar la línea temporal.
        </div>`;
        return;
      }

      const timesDisplay = events.map(timeForDisplay);
      let minT = Math.min(...timesDisplay),
        maxT = Math.max(...timesDisplay);
      const span = Math.max(1, maxT - minT);
      const pad = Math.max(30 * MS_PER_DAY, Math.floor(span * 0.4));
      const axisMin = minT - pad,
        axisMax = maxT + pad,
        axisSpan = axisMax - axisMin;

      let withPos = events.map((e) => {
        const tDisp = timeForDisplay(e);
        const pos = ((tDisp - axisMin) / axisSpan) * 100;
        return { ...e, pos: clamp(pos, 0, 100) };
      });

      withPos = placeLabels(withPos, timelineWrap.clientWidth || 800);

      const leftLabel = fmtDMY(ymd(new Date(minT)));
      const rightLabel = fmtDMY(ymd(new Date(maxT)));

      const pinsHtml = withPos
        .map((e) => {
          const left = `calc(${e.pos}% - 10px)`;
          const isMin = !!e.special,
            isLiq = e.key === "liq";
          const pin = isMin
            ? `<div class="w-4 h-4 rotate-45" style="background:${
                state.modoMin === "accidente" ? amber : azul
              }"
         title="${e.label}: ${fmtDMY(e.dateStr)}"></div>`
            : `<div class="w-4 h-4 rounded-full border-2"
         style="background:${
           isLiq ? "#e5e7eb" : "#ffffff"
         }; border-color:${azul}"
         title="${e.label}: ${fmtDMY(e.dateStr)}"></div>`;
          const rowClass = rowToClass(e.row);

          let resInfo = null,
            resLine = "";
          if (isMin) {
            resInfo = findResolucion(e.dateStr);
            if (resInfo?.url) {
              resLine = `<div class="mt-0.5">
                   <a href="${resInfo.url}" target="_blank" rel="noopener" class="link-mini text-blue-700 hover:opacity-80">
                     ${resInfo.res}
                   </a>
                 </div>`;
            } else {
              resLine =
                '<div class="mt-0.5 text[10px] text-gray-500">Sin resolución aplicable</div>';
            }
          }

          const editableAttr = e.editable
            ? 'contenteditable="true" data-editable="1"'
            : "";
          const hrefAttr =
            isMin && resInfo?.url
              ? `data-href="${resInfo.url}" title="Abrir ${resInfo.res}"`
              : "";
          const aria =
            isMin && resInfo?.res
              ? `aria-label="${e.label}: ${fmtDMY(
                  e.dateStr
                )} – ${resInfo.res} (clic para abrir)"`
              : `aria-label="${e.label}: ${fmtDMY(e.dateStr)}"`;

          const dateLine = e.editable
            ? `<div class="flex items-center justify-center gap-1">
       <div class="date-text no-drag" ${editableAttr}>${fmtDMY(
         e.dateStr
       )}</div>
       <button class="cal-btn no-drag" data-calkey="${
         e.key
       }" title="Elegir fecha">📅</button>
     </div>`
            : `<div class="date-text">${fmtDMY(e.dateStr)}</div>`;

          return `
  <div class="pin-wrapper absolute"
       data-key="${e.key}"
       data-draggable="${e.draggable ? 1 : 0}"
       data-pos="${e.pos.toFixed(4)}"
       tabindex="${e.draggable ? 0 : -1}"
       role="button"
       ${hrefAttr}
       ${aria}
       style="left:${left}; top:50%;">
    <div class="absolute w-4 h-4 -translate-y-1/2 flex items-center justify-center">${pin}</div>
    <div class="absolute -translate-x-1/2 text-center px-2 py-1 rounded-xl shadow-sm label-card ${rowClass}"
         style="background:#fff; border:1px solid #e5e7eb;">
      <div class="title font-semibold" style="color:${azul}">${e.label}</div>
      ${dateLine}
      ${resLine}
    </div>
  </div>`;
        })
        .join("");

      timelineWrap.innerHTML = `
        <div id="timelineArea" class="relative w-full h-40 select-none">
          <div class="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-[3px] bg-gray-200 rounded-full"></div>
          ${pinsHtml}
          <div class="absolute left-0 top-[58%] -translate-y-1/2 text-[10px] text-gray-500">${leftLabel}</div>
          <div class="absolute right-0 top-[58%] -translate-y-1/2 text-[10px] text-gray-500">${rightLabel}</div>
        </div>`;

      resolveCollisions();
      (state.modoMin === "liquidacion"
        ? alignMinRow("noti")
        : alignMinRow("accidente"));
      enableDragging(axisMin, axisSpan);
      enableInlineEditing();
      enableKeyboardNudges();
      enableMinClickOpen();
      enableCalendarButtons();
      updateHash();

      requestAnimationFrame(() => {
        resolveCollisions();
        (state.modoMin === "liquidacion"
          ? alignMinRow("noti")
          : alignMinRow("accidente"));
      });
    }

    function openDatePicker(anchorBtn, key, isoStr) {
      const input = document.createElement("input");
      input.type = "date";
      input.value = isoStr || "";
      input.className = "abs-date-picker";

      const rect = anchorBtn.getBoundingClientRect();
      const host = document.body;
      Object.assign(input.style, {
        position: "fixed",
        left: rect.left - 4 + "px",
        top: rect.bottom + 4 + "px",
        zIndex: 9999,
        padding: "6px 8px",
        border: "1px solid #e5e7eb",
        borderRadius: "8px",
        background: "#fff",
        boxShadow: "0 4px 12px rgba(0,0,0,.08)",
      });

      const commit = () => {
        const v = input.value;
        if (!v) {
          close();
          return;
        }
        if (key === "accidente") state.accidente = v;
        if (key === "cm") state.cm = v;
        if (key === "noti") state.noti = v;
        close();
        render();
      };
      const close = () => {
        input.removeEventListener("change", commit);
        window.removeEventListener("click", onOutside);
        window.removeEventListener("keydown", onEsc);
        host.removeChild(input);
      };
      const onOutside = (e) => {
        if (e.target !== input && e.target !== anchorBtn) close();
      };
      const onEsc = (e) => {
        if (e.key === "Escape") close();
      };

      input.addEventListener("change", commit);
      window.addEventListener("click", onOutside, { capture: true });
      window.addEventListener("keydown", onEsc);
      host.appendChild(input);
      input.focus();
    }

    function enableCalendarButtons() {
      const area = document.getElementById("timelineArea");
      if (!area) return;
      area.querySelectorAll(".cal-btn").forEach((btn) => {
        const key = btn.getAttribute("data-calkey");
        const iso =
          key === "accidente"
            ? state.accidente
            : key === "cm"
            ? state.cm
            : key === "noti"
            ? state.noti
            : "";
        btn.addEventListener("pointerdown", (e) => {
          e.stopPropagation();
        });
        btn.onclick = (e) => {
          e.stopPropagation();
          openDatePicker(btn, key, iso);
        };
      });
    }

    function placeLabels(arr, widthPx) {
      const labelW = 150,
        minGap = 6;
      const rows = {
        top1: -Infinity,
        top2: -Infinity,
        bottom1: -Infinity,
        bottom2: -Infinity,
      };
      const sorted = [...arr].sort((a, b) => a.pos - b.pos);
      const out = [];
      for (let i = 0; i < sorted.length; i++) {
        const e = sorted[i];
        const x = (e.pos / 100) * widthPx,
          left = x - labelW / 2,
          right = x + labelW / 2;
        const order =
          i % 2 === 0
            ? ["top1", "bottom1", "top2", "bottom2"]
            : ["bottom1", "top1", "bottom2", "top2"];
        let row = "top1";
        for (const r of order) {
          if (left > rows[r] + minGap) {
            row = r;
            rows[r] = right;
            break;
          }
        }
        out.push({ ...e, row });
      }
      return arr.map((e) =>
        out.find((r) => r.key === e.key && Math.abs(r.pos - e.pos) < 1e-6)
      );
    }

    function rowToClass(row) {
      switch (row) {
        case "top1":
          return "-top-[64px]";
        case "top2":
          return "-top-[104px]";
        case "bottom1":
          return "top-[26px]";
        case "bottom2":
          return "top-[66px]";
        default:
          return "top-[26px]";
      }
    }

    function resolveCollisions() {
      const area = document.getElementById("timelineArea");
      if (!area) return;
      const width = area.clientWidth || 800;
      const pins = [...area.querySelectorAll(".pin-wrapper")]
        .map((pin) => {
          const pos = parseFloat(pin.getAttribute("data-pos") || "0");
          const card = pin.querySelector(".label-card");
          const w = card ? card.getBoundingClientRect().width : 150;
          return { pin, pos, w };
        })
        .sort((a, b) => a.pos - b.pos);

      const minGap = 6;
      const rowsRight = {
        top1: -Infinity,
        bottom1: -Infinity,
        top2: -Infinity,
        bottom2: -Infinity,
      };

      pins.forEach((p, idx) => {
        const x = (p.pos / 100) * width;
        const left = x - p.w / 2;
        const right = x + p.w / 2;
        const order =
          idx % 2 === 0
            ? ["top1", "bottom1", "top2", "bottom2"]
            : ["bottom1", "top1", "bottom2", "top2"];

        let row = "top1";
        for (const r of order) {
          if (left > rowsRight[r] + minGap) {
            row = r;
            rowsRight[r] = right;
            break;
          }
        }
        applyRowClass(p.pin, row);
      });
    }

    function alignMinRow(anchorKey) {
      const area = document.getElementById("timelineArea");
      if (!area) return;

      const minCard = area.querySelector(
        '.pin-wrapper[data-key="min"] .label-card'
      );
      if (!minCard) return;

      const ROWS = [
        "-top-[64px]",
        "-top-[104px]",
        "top-[26px]",
        "top-[66px]",
      ];
      minCard.classList.remove(...ROWS);
      minCard.style.marginLeft = "";

      if (anchorKey === "accidente") {
        minCard.classList.add("top-[26px]");
        const pad = 6;
        const mr = minCard.getBoundingClientRect();

        const overlapBottom1 = [
          ...area.querySelectorAll(".label-card"),
        ].some((card) => {
          if (card === minCard) return false;
          if (!card.classList.contains("top-[26px]")) return false;
          const r = card.getBoundingClientRect();
          return !(
            r.right + pad < mr.left || r.left - pad > mr.right
          );
        });

        if (overlapBottom1) {
          minCard.classList.remove("top-[26px]");
          minCard.classList.add("top-[66px]");
        }
        return;
      }

      const anchorCard = area.querySelector(
        '.pin-wrapper[data-key="noti"] .label-card'
      );
      if (!anchorCard) return;

      for (const cls of ROWS) {
        if (anchorCard.classList.contains(cls)) {
          minCard.classList.add(cls);
          break;
        }
      }

      const pad = 8;
      const ar = anchorCard.getBoundingClientRect();
      const mr = minCard.getBoundingClientRect();
      const overlap = ar.right + pad - mr.left;
      if (overlap > 0) {
        minCard.style.marginLeft = `${Math.ceil(overlap)}px`;
      }
    }

    function applyRowClass(pin, row) {
      const card = pin.querySelector(".label-card");
      if (!card) return;
      card.classList.remove(
        "-top-[64px]",
        "-top-[104px]",
        "top-[26px]",
        "top-[66px]"
      );
      card.classList.add(rowToClass(row));
    }

    function enableMinClickOpen() {
      const area = document.getElementById("timelineArea");
      if (!area) return;
      const minPin = area.querySelector('.pin-wrapper[data-key="min"]');
      if (!minPin) return;
      const href = minPin.getAttribute("data-href");
      if (href) {
        minPin.addEventListener("click", (ev) => {
          const a = ev.target.closest("a[href]");
          if (a) return;
          window.open(href, "_blank", "noopener");
        });
        minPin.addEventListener("keydown", (e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            window.open(href, "_blank", "noopener");
          }
        });
      }
    }

    function enableDragging(axisMin, axisSpan) {
      const area = document.getElementById("timelineArea");
      const pins = area.querySelectorAll('.pin-wrapper[data-draggable="1"]');
      pins.forEach((pin) => {
        const key = pin.getAttribute("data-key");
        pin.onpointerdown = (ev) => {
          if (ev.target.closest(".no-drag, a[href]")) return;

          ev.preventDefault();
          pin.setPointerCapture(ev.pointerId);
          pin.setAttribute("data-dragging", "1");

          const rect = area.getBoundingClientRect();
          const startX = ev.clientX;
          let moved = false;
          const MOVE_PX_THRESHOLD = 4;

          const onMove = (ev2) => {
            if (
              !moved &&
              Math.abs(ev2.clientX - startX) < MOVE_PX_THRESHOLD
            )
              return;
            moved = true;

            const ratio = clamp(
              (ev2.clientX - rect.left) / rect.width,
              0,
              1
            );
            const tMs = axisMin + ratio * axisSpan;
            const dStr = ymd(new Date(roundToDay(tMs)));
            pin.style.left = `calc(${ratio * 100}% - 10px)`;
            const node = pin.querySelector(".date-text");
            if (node) node.textContent = fmtDMY(dStr);
          };

          const onUp = (ev3) => {
            pin.releasePointerCapture(ev.pointerId);
            pin.removeAttribute("data-dragging");
            window.removeEventListener("pointermove", onMove);
            window.removeEventListener("pointerup", onUp);

            if (!moved) return;

            const rect2 = area.getBoundingClientRect();
            const ratio = clamp(
              (ev3.clientX - rect2.left) / rect2.width,
              0,
              1
            );
            const tMs = axisMin + ratio * axisSpan;
            const dStr = ymd(new Date(roundToDay(tMs)));
            if (key === "accidente") state.accidente = dStr;
            if (key === "cm") state.cm = dStr;
            if (key === "noti") state.noti = dStr;
            render();
          };

          window.addEventListener("pointermove", onMove);
          window.addEventListener("pointerup", onUp);
        };
      });
    }

    function enableInlineEditing() {
      const area = document.getElementById("timelineArea");
      const nodes = area.querySelectorAll(
        '.date-text[data-editable="1"]'
      );
      nodes.forEach((node) => {
        const wrapper = node.closest(".pin-wrapper");
        const key = wrapper.getAttribute("data-key");
        const commit = (txt) => {
          const d = parseAnyDate(txt);
          if (!d) {
            node.classList.add("error");
            return;
          }
          node.classList.remove("error");
          const s = ymd(d);
          if (key === "accidente") state.accidente = s;
          if (key === "cm") state.cm = s;
          if (key === "noti") state.noti = s;
          render();
        };
        node.addEventListener("keydown", (e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commit(node.textContent.trim());
          }
        });
        node.addEventListener("blur", () =>
          commit(node.textContent.trim())
        );
      });
    }

    function enableKeyboardNudges() {
      const area = document.getElementById("timelineArea");
      if (!area) return;
      const editablePins = area.querySelectorAll(
        '.pin-wrapper[data-draggable="1"]'
      );
      editablePins.forEach((pin) => {
        const key = pin.getAttribute("data-key");
        pin.addEventListener("keydown", (e) => {
          const isLeft = e.key === "ArrowLeft";
          const isRight = e.key === "ArrowRight";
          if (!isLeft && !isRight) return;
          e.preventDefault();
          const step = e.ctrlKey ? 30 : e.shiftKey ? 7 : 1;
          const delta = (isLeft ? -1 : 1) * step;
          const cur =
            key === "accidente"
              ? state.accidente
              : key === "cm"
              ? state.cm
              : state.noti;
          const next = addDaysStr(cur, delta);
          if (key === "accidente") state.accidente = next;
          if (key === "cm") state.cm = next;
          if (key === "noti") state.noti = next;
          render();
        });
      });
    }

    function updateHash() {
      const p = new URLSearchParams();
      p.set("a", state.accidente);
      p.set("c", state.cm);
      p.set("n", state.noti);
      p.set("m", state.modoMin === "accidente" ? "a" : "l");
      history.replaceState(null, "", "#" + p.toString());
    }
    function loadFromHash() {
      if (!location.hash) return;
      const p = new URLSearchParams(location.hash.slice(1));
      state.accidente = p.get("a") || state.accidente;
      state.cm = p.get("c") || state.cm;
      state.noti = p.get("n") || state.noti;
      const m = p.get("m");
      if (m === "a") state.modoMin = "accidente";
      if (m === "l") state.modoMin = "liquidacion";
    }
    window.addEventListener("hashchange", () => {
      loadFromHash();
      render();
    });

    (function init() {
      loadFromHash();
      (state.modoMin === "accidente" ? btnMinAcc : btnMinLiq).click();

      if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(() => {
          render();
        });
      } else {
        window.addEventListener("load", render, { once: true });
      }
      window.addEventListener("resize", () => render());
    })();
  }, []);

  return (
    <div className="w-full">
      {/* CSS específico de esta herramienta */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
          .pin-wrapper{ cursor:default }
          .pin-wrapper[data-draggable="1"]{ cursor:grab }
          .pin-wrapper[data-dragging="1"]{ cursor:grabbing }
          .pin-wrapper[data-key="min"][data-href]{ cursor:pointer }
          .label-card{ width:150px; max-width:150px; font-size:11px; }
          .label-card .title{ font-size:11px; }
          .label-card .date-text{ font-size:10px; outline:none; }
          .date-text[contenteditable="true"]:focus{ box-shadow:0 0 0 2px rgba(15,47,75,.25); border-radius:10px; }
          .date-text.error{ color:#b91c1c; }
          .link-mini{ font-size:10px; text-decoration:underline; text-decoration-style:dotted; }
          #warnAccidente b{ color:${AZUL}; }
        `,
        }}
      />
      <div className="max-w-5xl mx-auto bg-white rounded-2xl shadow p-4 sm:p-6">
        <div className="flex items-center justify-start gap-3">
          <h1
            className="text-lg sm:text-xl font-bold"
            style={{ color: AZUL }}
          >
            {/* Podés ponerle título si querés */}
          </h1>
          <div className="flex items-center gap-1 text-[10px] sm:text-xs text-gray-600">
            <span className="hidden sm:inline">
              Comparar resolución mínimos a la fecha de:
            </span>
            <div className="inline-flex bg-gray-100 rounded-2xl p-0.5">
              <button
                id="btnMinLiquidacion"
                className="px-2 py-1 rounded-2xl text-[10px] sm:text-xs bg-white shadow"
                aria-pressed="true"
              >
                Liquidación
              </button>
              <button
                id="btnMinAccidente"
                className="px-2 py-1 rounded-2xl text-[10px] sm:text-xs text-gray-600"
                aria-pressed="false"
              >
                Accidente / PMI
              </button>
            </div>
          </div>
        </div>

        <div
          id="warnAccidente"
          className="hidden mt-2 border border-sky-300 bg-sky-50 text-sky-800 rounded-xl px-3 py-2 text-[11px]"
        >
          ℹ️ Si comparás el resultado de la fórmula actualizado por RIPTE a la
          fecha en que la indemnización debería haberse liquidado o puesta a
          disposición (conforme Ley N° 24.557 art. 12 inc. 1 y 2) con los
          mínimos de las <b>Resoluciones</b> al momento del{" "}
          <b>Fecha del Accidente</b>, puede implicar{" "}
          <b>valores desactualizados</b>. Se sugiere actualizar por alguna tasa.
        </div>

        <div className="mt-4" id="timelineWrap">
          <div className="text-xs text-gray-500 border rounded-xl p-3 bg-gray-50">
            Cargá o arrastrá fechas para visualizar la línea temporal.
          </div>
        </div>
      </div>
    </div>
  );
}
