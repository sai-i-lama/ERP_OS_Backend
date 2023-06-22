const { getPagination } = require("../../../utils/query");
const { PrismaClient } = require("@prisma/client");
const { query } = require("express");
const prisma = new PrismaClient();

const createSingleRole = async (req, res) => {
  try {
    if (req.query.query === "deletemany") {
      const deletedRole = await prisma.role.deleteMany({
        where: {
          id: {
            in: req.body,
          },
        },
      });
      res.json(deletedRole);
    } else if (req.query.query === "createmany") {
      console.log(
        req.body.map((role) => {
          return {
            name: role.name,
          };
        })
      );
      console.log(req.body);
      const createdRole = await prisma.role.createMany({
        data: req.body,
        skipDuplicates: true,
      });
      res.status(200).json(createdRole);
    } else {
      const createdRole = await prisma.role.create({
        data: {
          name: req.body.name,
        },
      });
      res.status(200).json(createdRole);
    }
  } catch (error) {
    res.status(400).json(error.message);
    console.log(error.message);
  }
};

const getAllRole = async (req, res) => {
  if (req.query.query === "all") {
    const allRole = await prisma.role.findMany({
      orderBy: [
        {
          id: "asc",
        },
      ],
      include: {
        rolePermission: {
          include: {
            permission: true,
          },
        },
      },
    });
    res.json(allRole);
  } else if (req.query.status === "false") {
    try {
      const { skip, limit } = getPagination(req.query);
      const allRole = await prisma.role.findMany({
        where: {
          status: false,
        },
        orderBy: [
          {
            id: "asc",
          },
        ],
        skip: Number(skip),
        take: Number(limit),
        include: {
          rolePermission: {
            include: {
              permission: true,
            },
          },
        },
      });
      res.json(allRole);
    } catch (error) {
      res.status(400).json(error.message);
      console.log(error.message);
    }
  } else {
    const { skip, limit } = getPagination(req.query);
    try {
      const allRole = await prisma.role.findMany({
        orderBy: [
          {
            id: "asc",
          },
        ],
        where: {
          status: true,
        },
        skip: Number(skip),
        take: Number(limit),
        include: {
          rolePermission: {
            include: {
              permission: true,
            },
          },
        },
      });
      res.json(allRole);
    } catch (error) {
      res.status(400).json(error.message);
      console.log(error.message);
    }
  }
};

const getSingleRole = async (req, res) => {
  try {
    const singleRole = await prisma.role.findUnique({
      where: {
        id: Number(req.params.id),
      },
      include: {
        rolePermission: {
          include: {
            permission: true,
          },
        },
      },
    });
    res.json(singleRole);
  } catch (error) {
    res.status(400).json(error.message);
    console.log(error.message);
  }
};

const updateSingleRole = async (req, res) => {
  try {
    const updatedRole = await prisma.role.update({
      where: {
        id: Number(req.params.id),
      },
      data: {
        name: req.body.name,
      },
    });
    res.json(updatedRole);
  } catch (error) {
    res.status(400).json(error.message);
    console.log(error.message);
  }
};

const deleteSingleRole = async (req, res) => {
  try {
    const deletedRole = await prisma.role.update({
      where: {
        id: Number(req.params.id),
      },
      data: {
        status: req.body.status,
      },
    });
    res.status(200).json(deletedRole);
  } catch (error) {
    res.status(400).json(error.message);
    console.log(error.message);
  }
};

module.exports = {
  createSingleRole,
  getAllRole,
  getSingleRole,
  updateSingleRole,
  deleteSingleRole,
};
