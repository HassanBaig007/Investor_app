"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InvestmentsService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const project_schema_1 = require("../projects/schemas/project.schema");
let InvestmentsService = class InvestmentsService {
    projectModel;
    constructor(projectModel) {
        this.projectModel = projectModel;
    }
    getExpectedEndDate(project) {
        const createdAt = project?.createdAt ? new Date(project.createdAt) : null;
        const durationText = String(project?.duration || '').toLowerCase();
        if (!createdAt || Number.isNaN(createdAt.getTime()))
            return null;
        if (!durationText)
            return null;
        const regex = /(\d+)/;
        const match = regex.exec(durationText);
        if (!match)
            return null;
        const value = Number(match[1]);
        if (Number.isNaN(value) || value <= 0)
            return null;
        const months = durationText.includes('year') ? value * 12 : value;
        const expected = new Date(createdAt);
        expected.setMonth(expected.getMonth() + months);
        return expected.toISOString().split('T')[0];
    }
    buildInvestment(project, userId) {
        const investor = project.investors.find((inv) => inv.user.toString() === userId);
        const invested = investor?.investedAmount || 0;
        const share = project.raisedAmount > 0 ? invested / project.raisedAmount : 0;
        const currentValuation = project.currentValuation || project.targetAmount;
        const userValue = share * currentValuation;
        const userReturns = userValue - invested;
        return {
            id: String(project._id),
            projectId: project._id,
            name: project.name,
            type: project.type,
            invested,
            currentValue: userValue,
            returns: userReturns,
            returnsPercent: invested > 0 ? (userReturns / invested) * 100 : 0,
            status: project.status,
            progress: project.targetAmount > 0
                ? (project.raisedAmount / project.targetAmount) * 100
                : 0,
            startDate: project.createdAt,
            expectedEndDate: this.getExpectedEndDate(project),
        };
    }
    getQuarterPeriods() {
        return [
            { quarter: 'Q1', period: 'Apr - Jun', startMonth: 4, endMonth: 6 },
            { quarter: 'Q2', period: 'Jul - Sep', startMonth: 7, endMonth: 9 },
            { quarter: 'Q3', period: 'Oct - Dec', startMonth: 10, endMonth: 12 },
            { quarter: 'Q4', period: 'Jan - Mar', startMonth: 1, endMonth: 3 },
        ];
    }
    hasInvestmentBeforeDate(investments, date) {
        return investments.some((inv) => {
            const startDate = new Date(inv.startDate);
            return startDate <= date;
        });
    }
    isCurrentQuarter(year, currentYear, currentMonth, quarter) {
        return (year === currentYear &&
            currentMonth >= quarter.startMonth &&
            currentMonth <= quarter.endMonth);
    }
    buildQuarterlyReport(year, quarter, quarterEndDate, isCurrentQuarter, portfolio, names) {
        const reportReturns = isCurrentQuarter
            ? Math.round(portfolio.returns || 0)
            : 0;
        const reportGrowth = isCurrentQuarter
            ? Number((portfolio.returnsPercent || 0).toFixed(1))
            : 0;
        return {
            id: `${year}-${quarter.quarter}`,
            quarter: quarter.quarter,
            year: String(year),
            period: quarter.period,
            status: isCurrentQuarter ? 'available' : 'historical',
            publishedDate: quarterEndDate.toISOString(),
            highlights: {
                portfolioGrowth: reportGrowth,
                totalReturns: reportReturns,
                dividendsReceived: 0,
                dataSource: isCurrentQuarter ? 'real' : 'insufficient_data',
            },
            investments: names,
        };
    }
    async getQuarterlyReports(userId) {
        const investments = await this.getInvestments(userId);
        const portfolio = await this.getPortfolio(userId);
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth() + 1;
        const quarterPeriods = this.getQuarterPeriods();
        const names = investments.slice(0, 5).map((inv) => inv.name);
        const reports = [];
        for (const year of [currentYear, currentYear - 1]) {
            for (const q of quarterPeriods) {
                const quarterEndDate = new Date(year, q.endMonth - 1, 28);
                if (quarterEndDate > now)
                    continue;
                const hasInvestmentsInPeriod = this.hasInvestmentBeforeDate(investments, quarterEndDate);
                if (!hasInvestmentsInPeriod)
                    continue;
                const isCurrentQuarter = this.isCurrentQuarter(year, currentYear, currentMonth, q);
                reports.push(this.buildQuarterlyReport(year, q, quarterEndDate, isCurrentQuarter, portfolio, names));
            }
        }
        return reports.sort((a, b) => new Date(b.publishedDate).getTime() -
            new Date(a.publishedDate).getTime());
    }
    async getQuarterlyReportDownload(userId, reportId, format = 'html') {
        const reports = await this.getQuarterlyReports(userId);
        const report = reports.find((r) => String(r.id) === String(reportId));
        if (!report) {
            throw new common_1.NotFoundException('Report not found');
        }
        const reportTitle = `${report.quarter} ${report.year} Investment Report`;
        const highlights = report.highlights || {};
        if (format === 'txt') {
            const text = [
                reportTitle,
                `Period: ${report.period}`,
                `Published: ${new Date(report.publishedDate).toISOString().split('T')[0]}`,
                `Portfolio Growth: ${highlights.portfolioGrowth ?? 0}%`,
                `Total Returns: ₹${Number(highlights.totalReturns || 0).toLocaleString()}`,
                `Dividends Received: ₹${Number(highlights.dividendsReceived || 0).toLocaleString()}`,
                `Data Source: ${highlights.dataSource || 'real'}`,
                '',
                'Investments:',
                ...(report.investments || []).map((name) => `- ${name}`),
                '',
                'Past performance is not indicative of future results. This report is for informational purposes only.',
            ].join('\n');
            return {
                format: 'txt',
                mimeType: 'text/plain',
                filename: `${report.id}_investment_report.txt`,
                content: text,
            };
        }
        const investmentsListHtml = (report.investments || [])
            .map((name) => '<li>' + name + '</li>')
            .join('');
        const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>${reportTitle}</title><style>body{font-family:Arial,sans-serif;margin:24px;color:#111827}h1{font-size:24px;margin-bottom:8px}.meta{color:#6B7280;margin-bottom:20px}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin:20px 0}.card{border:1px solid #E5E7EB;border-radius:8px;padding:12px}.label{font-size:12px;color:#6B7280}.value{font-size:20px;font-weight:700;margin-top:4px}ul{padding-left:20px}.disclaimer{margin-top:24px;color:#6B7280;font-size:12px}</style></head><body><h1>${reportTitle}</h1><div class="meta">Period: ${report.period} • Published: ${new Date(report.publishedDate).toISOString().split('T')[0]}</div><div class="grid"><div class="card"><div class="label">Portfolio Growth</div><div class="value">${highlights.portfolioGrowth ?? 0}%</div></div><div class="card"><div class="label">Total Returns</div><div class="value">₹${Number(highlights.totalReturns || 0).toLocaleString()}</div></div><div class="card"><div class="label">Dividends Received</div><div class="value">₹${Number(highlights.dividendsReceived || 0).toLocaleString()}</div></div><div class="card"><div class="label">Data Source</div><div class="value" style="font-size:16px">${highlights.dataSource || 'real'}</div></div></div><h3>Investments</h3><ul>${investmentsListHtml}</ul><div class="disclaimer">Past performance is not indicative of future results. This report is for informational purposes only and does not constitute investment advice.</div></body></html>`;
        return {
            format: 'html',
            mimeType: 'text/html',
            filename: `${report.id}_investment_report.html`,
            content: html,
        };
    }
    async getPortfolio(userId) {
        const projects = await this.projectModel
            .find({
            'investors.user': userId,
        })
            .exec();
        let totalInvested = 0;
        let returns = 0;
        projects.forEach((project) => {
            const investor = project.investors.find((inv) => inv.user.toString() === userId);
            if (investor && project.raisedAmount > 0) {
                totalInvested += investor.investedAmount;
                const share = investor.investedAmount / project.raisedAmount;
                const currentValuation = project.currentValuation || project.targetAmount;
                const userValue = share * currentValuation;
                returns += userValue - investor.investedAmount;
            }
        });
        return {
            totalInvested,
            currentValue: totalInvested + returns,
            returns,
            returnsPercent: totalInvested > 0 ? (returns / totalInvested) * 100 : 0,
            lastUpdated: new Date().toISOString(),
        };
    }
    async getInvestments(userId) {
        const projects = await this.projectModel
            .find({
            'investors.user': userId,
        })
            .exec();
        return projects.map((project) => this.buildInvestment(project, userId));
    }
    async getInvestmentById(id, userId) {
        const project = await this.projectModel.findById(id).exec();
        if (!project)
            throw new common_1.NotFoundException('Investment not found');
        const investor = project.investors.find((inv) => inv.user.toString() === userId);
        if (!investor)
            throw new common_1.NotFoundException('Investor not found in this project');
        return this.buildInvestment(project, userId);
    }
    async getPerformanceMetrics(userId, period = '6M') {
        const portfolio = await this.getPortfolio(userId);
        const investments = await this.getInvestments(userId);
        if (investments.length === 0) {
            return {
                period,
                hasData: false,
                message: 'No investments found. Performance metrics require active investments.',
                metrics: null,
                chartData: [],
            };
        }
        const totalInvested = portfolio.totalInvested;
        const currentValue = portfolio.currentValue;
        const returns = portfolio.returns;
        const returnsPercent = portfolio.returnsPercent;
        const cagr = returnsPercent;
        const hasHistoricalData = false;
        const metrics = {
            cagr: Number(cagr.toFixed(1)),
            returnsPercent: Number(returnsPercent.toFixed(1)),
            totalReturns: Math.round(returns),
            sharpeRatio: hasHistoricalData ? 0 : null,
            maxDrawdown: hasHistoricalData ? 0 : null,
            volatility: hasHistoricalData ? 0 : null,
        };
        const chartData = investments.map((inv) => ({
            label: inv.name,
            value: Number((inv.returnsPercent || 0).toFixed(1)),
        }));
        return {
            period,
            hasData: true,
            hasHistoricalData,
            message: hasHistoricalData
                ? undefined
                : 'Sharpe ratio, max drawdown, and volatility require historical valuation data. Only point-in-time metrics are available.',
            metrics,
            chartData,
            portfolio: {
                totalInvested,
                currentValue,
                returns: Math.round(returns),
                returnsPercent: Number(returnsPercent.toFixed(1)),
            },
        };
    }
};
exports.InvestmentsService = InvestmentsService;
exports.InvestmentsService = InvestmentsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(project_schema_1.Project.name)),
    __metadata("design:paramtypes", [mongoose_2.Model])
], InvestmentsService);
//# sourceMappingURL=investments.service.js.map