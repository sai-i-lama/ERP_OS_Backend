const { getPagination } = require("../../../utils/query");
const { PrismaClient } = require("@prisma/client");
const { query } = require("express");
const prisma = new PrismaClient();

const getAllPermission = async (req, res) => {
  if (req.query.query === "all") {
    const allRole = await prisma.permission.findMany({
      orderBy: [
        {
          id: "asc",
        },
      ],
    });
    res.json(allRole);
  } else {
    const { skip, limit } = getPagination(req.query);
    try {
      const allRole = await prisma.permission.findMany({
        orderBy: [
          {
            id: "asc",
          },
        ],
        skip: Number(skip),
        take: Number(limit),
      });
      res.json(allRole);
    } catch (error) {
      res.status(400).json(error.message);
      console.log(error.message);
    }
  }
};

module.exports = {
  getAllPermission,
};
