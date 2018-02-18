module.exports = (req, res, next) => {
  return req.redis.get('jdj:settings')
    .then(result => {
      return res.status(200).send({ success: true, body: (result ? JSON.parse(result) : { watch_dir: '', fixed_date: '' })  });
    })
    .catch(next)
  ;
};
