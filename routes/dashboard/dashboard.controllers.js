const { getPagination } = require("../../utils/query");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const getDashboardData = async (req, res) => {
	try {
		//==================================saleProfitCount===============================================
		// get all sale invoice by group
		const allSaleInvoice = await prisma.saleInvoice.groupBy({
			orderBy: {
				date: "asc",
			},
			by: ["date"],
			where: {
				date: {
					gte: new Date(req.query.startdate),
					lte: new Date(req.query.enddate),
				},
			},
			_sum: {
				total_amount: true,
				paid_amount: true,
				due_amount: true,
				profit: true,
			},
			_count: {
				id: true,
			},
		});
		// format response data for data visualization chart in antd
		const formattedData1 = allSaleInvoice.map((item) => {
			return {
				type: "Sales",
				date: item.date.toISOString().split("T")[0],
				amount: item._sum.total_amount,
			};
		});
		const formattedData2 = allSaleInvoice.map((item) => {
			return {
				type: "Profit",
				date: item.date.toISOString().split("T")[0],
				amount: item._sum.profit,
			};
		});
		const formattedData3 = allSaleInvoice.map((item) => {
			return {
				type: "Invoice Count",
				date: item.date.toISOString().split("T")[0],
				amount: item._count.id,
			};
		});
		// concat formatted data
		const saleProfitCount = formattedData1
			.concat(formattedData2)
			.concat(formattedData3);
		//==================================PurchaseVSSale===============================================
		// get all customer due amount
		const salesInfo = await prisma.saleInvoice.aggregate({
			_count: {
				id: true,
			},
			_sum: {
				total_amount: true,
			},
		});
		const purchasesInfo = await prisma.purchaseInvoice.aggregate({
			_count: {
				id: true,
			},
			_sum: {
				total_amount: true,
			},
		});
		// format response data for data visualization chart in antd
		const formattedData4 = [
			{ type: "sales", value: Number(salesInfo._sum.total_amount) },
		];
		const formattedData5 = [
			{ type: "purchases", value: Number(purchasesInfo._sum.total_amount) },
		];
		const SupplierVSCustomer = formattedData4.concat(formattedData5);
		//==================================customerSaleProfit===============================================
		// get all sale invoice by group
		const allSaleInvoiceByGroup = await prisma.saleInvoice.groupBy({
			by: ["customer_id"],
			_sum: {
				total_amount: true,
				profit: true,
			},
			_count: {
				id: true,
			},
			where: {
				date: {
					gte: new Date(req.query.startdate),
					lte: new Date(req.query.enddate),
				},
			},
		});
		// format response data for data visualization chart in antdantd
		const formattedData6 = await Promise.all(
			allSaleInvoiceByGroup.map(async (item) => {
				const customer = await prisma.customer.findUnique({
					where: { id: item.customer_id },
				});
				const formattedData = {
					label: customer.name,
					type: "Sales",
					value: item._sum.total_amount,
				};
				return formattedData;
			})
		);
		const formattedData7 = await Promise.all(
			allSaleInvoiceByGroup.map(async (item) => {
				const customer = await prisma.customer.findUnique({
					where: { id: item.customer_id },
				});
				return {
					label: customer.name,
					type: "Profit",
					value: item._sum.profit,
				};
			})
		);
		// concat formatted data
		const customerSaleProfit = [...formattedData6, ...formattedData7].sort(
			(a, b) => {
				a.value - b.value;
			}
		);
		//==================================cardInfo===============================================
		const purchaseInfo = await prisma.purchaseInvoice.aggregate({
			_count: {
				id: true,
			},
			_sum: {
				total_amount: true,
				due_amount: true,
				paid_amount: true,
			},
			where: {
				date: {
					gte: new Date(req.query.startdate),
					lte: new Date(req.query.enddate),
				},
			},
		});
		const saleInfo = await prisma.saleInvoice.aggregate({
			_count: {
				id: true,
			},
			_sum: {
				total_amount: true,
				due_amount: true,
				paid_amount: true,
				profit: true,
			},
			where: {
				date: {
					gte: new Date(req.query.startdate),
					lte: new Date(req.query.enddate),
				},
			},
		});
		// concat 2 object
		const cardInfo = {
			purchase_count: purchaseInfo._count.id,
			purchase_total: Number(purchaseInfo._sum.total_amount),
			sale_count: saleInfo._count.id,
			sale_total: Number(saleInfo._sum.total_amount),
			sale_profit: Number(saleInfo._sum.profit),
		};
		res.json({
			saleProfitCount,
			SupplierVSCustomer,
			customerSaleProfit,
			cardInfo,
		});
	} catch (error) {
		res.status(400).json(error.message);
		console.log(error.message);
	}
};

module.exports = {
	getDashboardData,
};
