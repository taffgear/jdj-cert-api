const bb        = require('bluebird');
const sql 		  = bb.promisifyAll(require("mssql"));
const errors    = require('../../lib/classes/errors');

module.exports = function (req, res, next) {
		return req.mssql.request()
	      .input('itemno', sql.NVarChar, req.params.itemno.toLowerCase().replace(/\W/g, ''))
        .query('SELECT TOP 1 dbo.Stock.RECID, dbo.Stock.ITEMNO, dbo.Stock.PGROUP, dbo.Stock.GRPCODE, dbo.Stock.LASTSER#1, dbo.Stock.PERIOD#1, dbo.Stock.CURRDEPOT, dbo.Stock.DESC#1, dbo.Stock.DESC#2, dbo.Stock.DESC#3, dbo.Stock.PATLASTSER, dbo.Stock.STATUS, dbo.Stock.SERNO FROM dbo.Stock WHERE LOWER(dbo.Stock.ITEMNO) = @itemno')
        .then(result => {
            if (!result || !result.recordset.length)
              throw new errors.http.NotFound('Geen artikel gevonden met nummer: ' + req.params.itemno);

            return res.status(200).send({ success: true, body: result.recordset[0] });
        })
        .catch(next)
      ;
}
