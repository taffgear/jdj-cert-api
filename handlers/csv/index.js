
module.exports = (req, res, next) => {
  console.log(req.body);
  return res.status(200).send({ success: true });
}
