const { prisma } = require("../config/db");

const formatReportRecord = (r) => {
  if (!r) return null;
  const clone = { ...r };
  clone._id = r.id;
  clone.reporter = r.reporterId;
  clone.reportedUser = r.reportedUserId;
  clone.reportedMessage = r.reportedMessageId;
  return clone;
};

class ReportModel {
  async create(data) {
    const created = await prisma.report.create({
      data: {
        reporterId: data.reporter ? data.reporter.toString() : data.reporterId,
        reportedUserId: data.reportedUser ? data.reportedUser.toString() : data.reportedUserId || null,
        reportedMessageId: data.reportedMessage ? data.reportedMessage.toString() : data.reportedMessageId || null,
        reason: data.reason,
        status: data.status || "pending",
      },
    });
    return formatReportRecord(created);
  }

  async find(query = {}) {
    let where = {};
    if (query.status) where.status = query.status;
    const reports = await prisma.report.findMany({ where, orderBy: { createdAt: "desc" } });
    return reports.map(formatReportRecord);
  }
}

const Report = new ReportModel();
module.exports = Report;
