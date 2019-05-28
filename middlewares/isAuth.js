module.exports = (req, res, next) => {
     if(!req.session.isLoggedIn) {
          console.log('User is not logged in!');
          return res.redirect('/login');
     }
     next();
}