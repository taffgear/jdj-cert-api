const bb        = require('bluebird');
const sql 		  = bb.promisifyAll(require("mssql"));
const errors    = require('../../lib/classes/errors');

module.exports = function (req, res, next) {
		return req.mssql.request()
		    .input('lastser', sql.NVarChar, req.body.lastser)
		    .input('period', sql.Int, parseInt(req.body.period))
        .input('serno', sql.NVarChar, req.body.serno)
        .input('status', sql.Int, parseInt(req.body.status))
        .input('pattest', sql.Int, parseInt(req.body.pattest))
        .input('patperiod', sql.Int, parseInt(req.body.period))
        .input('patlastser', sql.NVarChar, req.body.patlastser)
        .input('patpertype', sql.NVarChar, req.body.patpertype)
        .input('itemno', sql.NVarChar, req.body.itemno)
		    .query('UPDATE dbo.Stock SET LASTSER#3 = @lastser, PERIOD#1 = @period, SERNO = @serno, STATUS = @status, PATTEST = @pattest, PATPERIOD = @patperiod, PATLASTSER = @patlastser, PATPERTYPE = @patpertype WHERE ITEMNO = @itemno')
        .then(result => res.status(200).send({ success: true, rowsAffected: result.rowsAffected[0] }))
        .catch(next)
      ;
}
