const { getPagination } = require("../../../utils/query");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const createRolePermission = async (req, res) => {
  try {
    if (req.query.query === "deletemany") {
      const deletedRolePermission = await prisma.rolePermission.deleteMany({
        where: {
          id: {
            in: req.body,
          },
        },
      });
      res.json(deletedRolePermission);
    } else {
      // convert all incoming data to a specific format.
      const data = req.body.permission_id.map((permission_id) => {
        return {
          role_id: req.body.role_id,
          permission_id: permission_id,
        };
      });
      const createdRolePermission = await prisma.rolePermission.createMany({
        data: data,
        skipDuplicates: true,
      });
      res.status(200).json(createdRolePermission);
    }
  } catch (error) {
    res.status(400).json(error.message);
    console.log(error.message);
  }
};

// TODO: not in use and should be removed in future
const getAllRolePermission = async (req, res) => {
  if (req.query.query === "all") {
    const allRolePermission = await prisma.rolePermission.findMany({
      orderBy: [
        {
          id: "asc",
        },
      ],
      include: {
        role: true,
        permission: true,
      },
    });
    res.json(allRolePermission);
  } else {
    const { skip, limit } = getPagination(req.query);
    try {
      const allRolePermission = await prisma.rolePermission.findMany({
        orderBy: [
          {
            id: "asc",
          },
        ],
        skip: Number(skip),
        take: Number(limit),
        include: {
          role: true,
          permission: true,
        },
      });

      res.json(allRolePermission);
    } catch (error) {
      res.status(400).json(error.message);
      console.log(error.message);
    }
  }
};

// TODO: not in use and should be removed in future
const getSingleRolePermission = async (req, res) => {
  try {
    const singleRolePermission = await prisma.rolePermission.findUnique({
      where: {
        id: Number(req.params.id),
      },
    });
    res.json(singleRolePermission);
  } catch (error) {
    res.status(400).json(error.message);
    console.log(error.message);
  }
};

// TODO: not in use and should be removed in future
const updateRolePermission = async (req, res) => {
  try {
    // convert all incoming data to a specific format.
    const data = req.body.permission_id.map((permission_id) => {
      return {
        role_id: req.body.role_id,
        permission_id: permission_id,
      };
    });
    const updatedRolePermission = await prisma.rolePermission.createMany({
      data: data,
      skipDuplicates: true,
    });
    res.json(updatedRolePermission);
  } catch (error) {
    res.status(400).json(error.message);
    console.log(error.message);
  }
};

// delete and update account as per RolePermission
// TODO: not in use and should be removed in future
const deleteSingleRolePermission = async (req, res) => {
  try {
    const deletedRolePermission = await prisma.rolePermission.delete({
      where: {
        id: Number(req.params.id),
      },
    });
    res.status(200).json(deletedRolePermission);
  } catch (error) {
    res.status(400).json(error.message);
    console.log(error.message);
  }
};

module.exports = {
  createRolePermission,
  getAllRolePermission,
  getSingleRolePermission,
  updateRolePermission,
  deleteSingleRolePermission,
};
