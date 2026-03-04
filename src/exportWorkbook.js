import ExcelJS from "exceljs";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

const COLORS = {
  white: "FFFFFFFF",
  navyDark: "FF1F4E79",
  navyMid: "FF2E75B6",
  dateBg: "FFDAE3F3",
  compBg: "FFE2EFDA",
  actBg: "FFFFFFFF",
  mlidBg: "FFFFF2CC",
  remBg: "FFFCE4D6",
  red: "FFFF0000",
  whiteText: "FFFFFFFF",
};

const NONE = { style: null };

function border(style) {
  return { style, color: { argb: "FF000000" } };
}

function styleCell(
  cell,
  {
    value = "",
    bold = false,
    size = 9,
    fontColor = "FF000000",
    italic = false,
    bg = "FFFFFFFF",
    hAlign = "left",
    vAlign = "center",
    wrapText = true,
    borderTop = null,
    borderBottom = null,
    borderLeft = null,
    borderRight = null,
  } = {},
) {
  cell.value = value;
  cell.font = { bold, size, color: { argb: fontColor }, italic };
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bg } };
  cell.alignment = { horizontal: hAlign, vertical: vAlign, wrapText };
  cell.border = {
    top: borderTop ? border(borderTop) : NONE,
    bottom: borderBottom ? border(borderBottom) : NONE,
    left: borderLeft ? border(borderLeft) : NONE,
    right: borderRight ? border(borderRight) : NONE,
  };
}

function buildWorksheet(ws, month, meta, sig) {
  const syYear = meta.schoolYear.split(" - ")[0].trim();
  const dayColumns = [2, 4, 6, 8, 10];

  ws.columns = [
    { key: "A", width: 28 },
    { key: "B", width: 20 },
    { key: "C", width: 4 },
    { key: "D", width: 20 },
    { key: "E", width: 4 },
    { key: "F", width: 20 },
    { key: "G", width: 4 },
    { key: "H", width: 20 },
    { key: "I", width: 4 },
    { key: "J", width: 20 },
    { key: "K", width: 4 },
  ];

  let row = 1;

  ws.getRow(row).height = 18;
  styleCell(ws.getCell(row, 1), {
    value: "BUDGETTED COURSE OUTLAY",
    bold: true,
    size: 13,
    hAlign: "center",
  });
  ws.mergeCells(row, 1, row, 11);
  row += 1;

  ws.getRow(row).height = 18;
  styleCell(ws.getCell(row, 1), {
    value: `GRADE ${meta.grade} - ${meta.subject}`,
    bold: true,
    size: 13,
    fontColor: COLORS.red,
    hAlign: "center",
  });
  ws.mergeCells(row, 1, row, 11);
  row += 1;

  ws.getRow(row).height = 16;
  styleCell(ws.getCell(row, 1), {
    value: `School Year ${meta.schoolYear}`,
    size: 10,
    hAlign: "center",
    borderBottom: "medium",
  });
  ws.mergeCells(row, 1, row, 11);
  row += 1;

  ws.getRow(row).height = 20;
  styleCell(ws.getCell(row, 1), {
    value: `${month.name.toUpperCase()} ${syYear}`,
    bold: true,
    size: 14,
    fontColor: COLORS.whiteText,
    bg: COLORS.navyDark,
    hAlign: "center",
    borderTop: "medium",
    borderBottom: "medium",
    borderLeft: "medium",
    borderRight: "medium",
  });
  ws.mergeCells(row, 1, row, 11);
  row += 1;

  ws.getRow(row).height = 18;
  styleCell(ws.getCell(row, 1), {
    bg: COLORS.navyMid,
    borderTop: "medium",
    borderBottom: "thin",
    borderLeft: "medium",
    borderRight: "thin",
  });

  DAYS.forEach((day, index) => {
    const column = dayColumns[index];
    const isLast = index === DAYS.length - 1;
    styleCell(ws.getCell(row, column), {
      value: day,
      bold: true,
      size: 10,
      fontColor: COLORS.whiteText,
      bg: COLORS.navyMid,
      hAlign: "center",
      borderTop: "medium",
      borderBottom: "thin",
      borderLeft: "thin",
      borderRight: isLast ? "medium" : "thin",
    });
    styleCell(ws.getCell(row, column + 1), {
      bg: COLORS.navyMid,
      borderTop: "medium",
      borderBottom: "thin",
      borderRight: isLast ? "medium" : "thin",
    });
    ws.mergeCells(row, column, row, column + 1);
  });
  row += 1;

  month.weeks.forEach((week, weekIndex) => {
    ws.getRow(row).height = 18;
    styleCell(ws.getCell(row, 1), {
      value: `WEEK ${weekIndex + 1}`,
      bold: true,
      size: 11,
      fontColor: COLORS.whiteText,
      bg: COLORS.navyMid,
      hAlign: "center",
      borderTop: "medium",
      borderBottom: "thin",
      borderLeft: "medium",
      borderRight: "medium",
    });
    ws.mergeCells(row, 1, row, 11);
    row += 1;

    const rows = [
      {
        label: "Target Date / Week #",
        key: "dates",
        bg: COLORS.dateBg,
        height: 16,
        bold: true,
        hAlign: "center",
        vAlign: "center",
      },
      {
        label: "Competencies",
        key: "competencies",
        bg: COLORS.compBg,
        height: 45,
      },
      {
        label: "Activities",
        key: "activities",
        bg: COLORS.actBg,
        height: 80,
      },
      {
        label: "Mastery Level and Instructional Decision (MLID)",
        key: "mlid",
        bg: COLORS.mlidBg,
        height: 35,
      },
      {
        label: "Remarks",
        key: "remarks",
        bg: COLORS.remBg,
        height: 16,
        borderBottom: "medium",
      },
    ];

    rows.forEach((rowConfig, rowIndex) => {
      const isFirst = rowIndex === 0;
      const isLast = rowIndex === rows.length - 1;

      ws.getRow(row).height = rowConfig.height;
      styleCell(ws.getCell(row, 1), {
        value: rowConfig.label,
        size: 8,
        bold: rowConfig.key === "dates",
        bg: rowConfig.bg,
        hAlign: "left",
        vAlign: rowConfig.key === "dates" ? "center" : "top",
        borderTop: isFirst ? "medium" : "thin",
        borderBottom: isLast ? "medium" : "thin",
        borderLeft: "medium",
        borderRight: "thin",
      });

      DAYS.forEach((day, dayIndex) => {
        const column = dayColumns[dayIndex];
        const isLastDay = dayIndex === DAYS.length - 1;
        styleCell(ws.getCell(row, column), {
          value: week[rowConfig.key][day] || "",
          size: rowConfig.key === "dates" ? 11 : 9,
          bold: rowConfig.key === "dates",
          bg: rowConfig.bg,
          hAlign: rowConfig.hAlign || "left",
          vAlign: rowConfig.vAlign || "top",
          borderTop: isFirst ? "medium" : "thin",
          borderBottom: isLast ? "medium" : "thin",
          borderLeft: "thin",
          borderRight: isLastDay ? "medium" : "thin",
        });
        styleCell(ws.getCell(row, column + 1), {
          bg: rowConfig.bg,
          borderTop: isFirst ? "medium" : "thin",
          borderBottom: isLast ? "medium" : "thin",
          borderRight: isLastDay ? "medium" : "thin",
        });
        ws.mergeCells(row, column, row, column + 1);
      });

      row += 1;
    });

    ws.getRow(row).height = 10;
    styleCell(ws.getCell(row, 1), {
      bg: "FFFFFFFF",
      borderLeft: "medium",
      borderRight: "medium",
    });
    DAYS.forEach((_, dayIndex) => {
      const column = dayColumns[dayIndex];
      const isLastDay = dayIndex === DAYS.length - 1;
      styleCell(ws.getCell(row, column), {
        bg: "FFFFFFFF",
        borderLeft: "thin",
        borderRight: isLastDay ? "medium" : "thin",
      });
      styleCell(ws.getCell(row, column + 1), {
        bg: "FFFFFFFF",
        borderRight: isLastDay ? "medium" : "thin",
      });
      ws.mergeCells(row, column, row, column + 1);
    });
    row += 1;
  });

  row += 1;
  ws.getRow(row).height = 16;
  ws.getCell(row, 1).value = "Number of School Days:";
  ws.getCell(row, 1).font = { bold: true, size: 9 };
  ws.getCell(row, 1).alignment = { horizontal: "right" };
  ws.mergeCells(row, 1, row, 2);
  ws.getCell(row, 3).value = month.schoolDays || "";
  ws.getCell(row, 3).font = { bold: true, size: 11 };
  row += 2;

  [
    ["Prepared by:", sig.preparedBy, sig.preparedPosition],
    ["Noted :", sig.notedBy, sig.notedPosition],
    ["Approved by:", sig.approvedBy, ""],
  ].forEach(([label, name, position]) => {
    ws.getRow(row).height = 16;
    ws.getCell(row, 1).value = label;
    ws.getCell(row, 1).font = { bold: true, size: 11 };
    ws.mergeCells(row, 1, row, 5);
    row += 1;

    ws.getRow(row).height = 20;
    const nameCell = ws.getCell(row, 1);
    nameCell.value = name;
    nameCell.font = { bold: true, size: 11, underline: true };
    nameCell.alignment = { horizontal: "center" };
    nameCell.border = { bottom: border("medium") };
    ws.mergeCells(row, 1, row, 5);
    row += 1;

    if (position) {
      ws.getRow(row).height = 14;
      const positionCell = ws.getCell(row, 1);
      positionCell.value = position;
      positionCell.font = { italic: true, size: 9 };
      positionCell.alignment = { horizontal: "center" };
      ws.mergeCells(row, 1, row, 5);
      row += 1;
    }

    row += 1;
  });

  ws.views = [{ state: "frozen", xSplit: 0, ySplit: 5, activeCell: "B6" }];
}

export async function downloadWorkbook({ months, meta, sig }) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "BCO Generator";
  workbook.created = new Date();

  months.forEach((month) => {
    const worksheet = workbook.addWorksheet(month.name.toUpperCase(), {
      pageSetup: {
        paperSize: 9,
        orientation: "landscape",
        fitToPage: true,
        fitToWidth: 1,
      },
    });
    buildWorksheet(worksheet, month, meta, sig);
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `BCO_${meta.subject.replace(/ /g, "_")}_${meta.grade}.xlsx`;
  anchor.click();
  URL.revokeObjectURL(url);
}
