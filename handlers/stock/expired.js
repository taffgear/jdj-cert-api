const bb        = require('bluebird');
const sql 		  = bb.promisifyAll(require("mssql"));
const errors    = require('../../lib/classes/errors');

module.exports = function (req, res, next) {
		return req.mssql.request()
        .query('SELECT TOP 200 dbo.Stock.ITEMNO, dbo.Stock.PGROUP, dbo.Stock.GRPCODE, dbo.Stock.LASTSER#1, dbo.Stock.PERIOD#1, dbo.Stock.CURRDEPOT, dbo.Stock.DESC#1, dbo.Stock.DESC#2, dbo.Stock.DESC#3 FROM dbo.Stock WHERE DATEADD(DAY, [PERIOD#1], [LASTSER#1]) < GETDATE() ORDER BY LASTSER#1 DESC')
        .then(result => {
            return res.status(200).send({ success: true, body: result.recordset });
        })
        .catch(next)
      ;
}
