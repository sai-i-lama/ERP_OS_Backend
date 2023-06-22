const { getPagination } = require("../../utils/query");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const updateSetting = async (req, res) => {
  try {
    const updatedSetting = await prisma.appSetting.update({
      where: {
        id: 1,
      },
      data: { ...req.body },
    });
    res.status(201).json(updatedSetting);
  } catch (error) {
    res.status(400).json(error.message);
    console.log(error.message);
  }
};

const getSetting = async (req, res) => {
  try {
    const newSetting = await prisma.appSetting.findUnique({
      where: {
        id: 1,
      },
    });
    res.status(201).json(newSetting);
  } catch (error) {
    res.status(400).json(error.message);
    console.log(error.message);
  }
};

module.exports = {
  updateSetting,
  getSetting,
};
