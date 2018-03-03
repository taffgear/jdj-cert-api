const bb        = require('bluebird');
const sql 		  = bb.promisifyAll(require("mssql"));
const reduce 		= require('lodash/reduce');
const errors    = require('../../lib/classes/errors');

module.exports = function (req, res, next) {
		const itemNumbers = reduce(req.body.itemNumbers || [], (acc, itemno) => {
			acc.push(itemno.toLowerCase().replace(/\W/g, ''));
			return acc;
		}, []).join("','");

		return req.mssql.request()
        .query("SELECT dbo.Stock.RECID, dbo.Stock.ITEMNO, dbo.Stock.PGROUP, dbo.Stock.GRPCODE, dbo.Stock.LASTSER#1, dbo.Stock.PERIOD#1, dbo.Stock.CURRDEPOT, dbo.Stock.DESC#1, dbo.Stock.DESC#2, dbo.Stock.DESC#3, dbo.Stock.PATLASTSER, dbo.Stock.STATUS, dbo.Stock.SERNO FROM dbo.Stock WHERE LOWER(dbo.Stock.ITEMNO) IN('" + itemNumbers + "')")
        .then(result => {
            if (!result || !result.recordset.length)
              throw new errors.http.NotFound('Could not find any stock items');

            return res.status(200).send({ success: true, body: result.recordset });
        })
        .catch(next)
      ;
}
