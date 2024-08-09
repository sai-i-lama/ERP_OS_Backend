const { getPaginationLogs } = require("../../utils/query");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const getAuditLogs = async (req, res) => {
  try {
    const { page, limit, startdate, enddate, user } = req.query;

    const { skip, take } = getPaginationLogs(req.query); // Utilisez req.query directement ici

    const where = {};
    if (startdate) {
      where.timestamp = { gte: new Date(startdate) };
    }
    if (enddate) {
      if (!where.timestamp) where.timestamp = {};
      where.timestamp.lte = new Date(enddate);
    }
    if (user) {
      where.IdUser = parseInt(user, 10); // Convertir en entier avec base 10
    }

    const logs = await prisma.auditLog.findMany({
      where,
      skip,
      take,
      include: {
        user: true,
      },
    });

    res.status(200).json(logs);
  } catch (error) {
    res.status(400).json(error.message);
    console.log(error.message);
  }
};

module.exports = {
  getAuditLogs,
};
