     // IMPORTING NPM PACKAGEs
const express = require('express');
const bodyParser = require('body-parser');
const multer = require('multer');
const path = require('path');
const mongoose = require('mongoose');

const session = require('express-session');
const MongodbSessionStore = require('connect-mongodb-session')(session);
const csrf = require('csurf');
const flash = require('connect-flash');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const fs = require('fs');
const https = require('https');

     // IMPORTING ROUTEs, CONTROLLERs, MODELs
const adminRoutes = require('./routes/admin');
const shopRoutes = require('./routes/shop');
const authRoutes = require('./routes/auth');
const errorController = require('./controllers/errorController');
const User = require('./models/User');

     // INITIATION of NPM PACKAGEs
const app = express();
app.set('view engine', 'ejs');
app.set('views', 'views');

const MONGODB_URI = `mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASSWORD}@cluster0-eyxah.mongodb.net/${process.env.MONGO_DEFAULT_DATABASE}?retryWrites=true`;
const storeSession = new MongodbSessionStore({uri: MONGODB_URI, collection: 'sessions'});
const fileStorage = multer.diskStorage({
     destination: (rewq, file, cb) => {
          cb(null, 'images');
     },
     filename: (req, file, cb) => {
          cb(null, new Date().toISOString() + '-' + file.originalname);
     }
});
const fileTypes = (req, file, cb) => {
     if(
          file.mimetype === 'image/jpg' ||
          file.mimetype === 'image/jpeg' ||
          file.mimetype === 'image/png'
     ) {
          cb(null, true);
     } else {
          cb(null, false);
     }
}

// const privateKey = fs.readFileSync('server.key');
// const certificate = fs.readFileSync('server.cert');

     // MIDDLEWAREs
app.use(bodyParser.urlencoded({extended:false}));
app.use(multer({storage: fileStorage, fileFilter: fileTypes}).single('image'));
// app.use(multer({storage: fileStorage}).array('images')); --> za više istih fajlova
// app.use(multer({storage: fileStorage}).any('images')); --> za više različitih fajlova
app.use(express.static(path.resolve('public')));
app.use('/images', express.static(path.resolve('images')));
app.use(session({secret: 'my secret', resave: false, saveUninitialized: false, store: storeSession}));
app.use(csrf());
app.use(flash());

app.use((req, res, next) => {
     res.locals.isAuthenticated = req.session.isLoggedIn;
     res.locals.csrfToken = req.csrfToken();
     res.locals.messages = req.flash('message');
     res.locals.user = req.session.user;
     console.log(res.locals.messages);
     next();
});

app.use((req, res, next) => {
     if(!req.session.user) {
          return next();
     }
     User.findById(req.session.user._id)
          .then(user => {
               if(!user) {
                    return next();
               }
               req.user = user;
               next();
          })
          .catch(err => {
               next(new Error(err)); 
          });
});

app.use(helmet());
app.use(compression());

const accessLogStream = fs.createWriteStream(
     path.resolve('access.log'), 
     {flags: 'a'});
app.use(morgan('combined', {stream: accessLogStream}));
// app.use(morgan('combined'));

     // Routes MIDDLEWAREs -> always at the end of the middlewares section
app.use('/admin', adminRoutes);
app.use(shopRoutes);
app.use(authRoutes);
app.get('/500', errorController.get500Page);
app.use(errorController.get404Page);

app.use((error, req, res, next) => {
     console.log(error);
     res.redirect('/500');
});

     // DB CONNECTION to APP. SERVER
mongoose.connect(MONGODB_URI, {useNewUrlParser: true})
     .then(result => {
          app.listen(process.env.PORT || 3000);
          // For using our own SSL/TSL protection (typically this is set on hosting server)
          // https
          //      .createServer({key: privateKey, cert: certificate}, app)
          //      .listen(process.env.PORT || 3000);
     })
     .catch(err => console.log(err));

