//jshint esversion:6
//this environment variable(env) file is used to keep the key hiddenso that when we add the code to the git repository it does not show
//you should add the .env file to the gitignore
require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose  = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const findOrCreate = require("mongoose-findorcreate");
//Level 4
// we use this becoz it is much better than md5
// const bcrypt = require("bcrypt");
//Number of times salting is done
// const saltRound = 10;
//Level 3
//It is uses hash function
// const md5 = require("md5");
//Level 2
//It is not used now because it is weak i.e. it is easy to decrypt
// const encrypt = require("mongoose-encryption");

const app = express();



app.use(express.static("public"));
app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({
  extended: true
}));

app.use(session({
  secret: "Our little secrets.",
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb://localhost:27017/userDB",{useNewUrlParser: true, useUnifiedTopology: true,useFindAndModify: false,
    useCreateIndex: true});
//To Avoid this error:-(node:37296) DeprecationWarning: collection.ensureIndex is deprecated. Use createIndexes instead.
mongoose.set("useCreateIndex", true);
//for using encryption you make the schema an object
const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  googleId: String,
  secret: String
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);
//plugin gives more functionality to the schema
//Level 2
// userSchema.plugin(encrypt, {secret: process.env.SECRET, encryptedFields: ["password"] });

const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());
//It is used to stuff the cookies
passport.serializeUser(function(user, done){
  done(null, user.id);
});
//It is used to crack the cookies and take the info from it
passport.deserializeUser(function(id, done){
  User.findById(id, function(err, user){
    done(err, user);
  });
});

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
    //this is for Google+ APi which is not available with this strategy so we remove it
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
    console.log(profile);
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

app.get("/", function(req, res){
  res.render("home");
});
app.get("/auth/google",
    passport.authenticate('google', {
        scope: ["profile"]
    }));

    app.get("/auth/google/secrets",
        passport.authenticate('google', { failureRedirect: '/login' }),
        function(req, res) {
            // Successful authentication, redirect secrets.
            res.redirect('/secrets');
        });

app.get("/login", function(req, res){
  res.render("login");
});

app.get("/register", function(req, res){
  res.render("register");
});

app.get("/secrets",function(req, res){
  //ne===not equal
  User.find({"secret": {$ne: null}}, function(err, foundUsers){
    if(err){
      console.log(err);
    }else{
      if(foundUsers){
      res.render("secrets", {usersWithSecrets: foundUsers});
       }
    }
  });
});

app.get("/submit", function(req, res){
  if(req.isAuthenticated()){
    res.render("submit");
  }else{
    res.redirect("/login");
  }
});



app.get("/logout", function(req, res){
  req.logout();
  res.redirect("/");
});

app.post("/submit", function(req, res){
  const submittedSecret = req.body.secret;
  User.findById(req.user.id, function(err, foundUser){
    foundUser.secret = submittedSecret;
    foundUser.save(function(){
      res.redirect("/secrets");
    });
  });

});

app.post("/register", function(req, res){

  User.register({username: req.body.username}, req.body.password, function(err, user){
    if(err){
      console.log(err);
      res.redirect("/register");
    }else{
      passport.authenticate("local")(req, res, function(){
        res.redirect("/secrets");
      });
    }
  })

});

app.post("/login", function(req, res){

   const user = new User({
     username: req.body.username,
     password: req.body.password
   });

   req.login(user, function(err){
     if(err){
       console.log(err);
     }else{
       passport.authenticate("local")(req, res, function(){
         res.redirect("/secrets");
       });
     }
   });

});
/////////////////For Security And Encryption only///////////////////
// app.post("/register", function(req, res){
//
//  bcrypt.hash(req.body.password, saltRound, function(err, hash){
//    const newUser = new User({
//      email: req.body.username,
//      password: hash
//    });
//    newUser.save(function(err){
//      if(err){
//        console.log(err);
//      }else{
//        res.render("secrets");
//      }
//    });
//  });
//
// });

// app.post("/login", function(req, res){
//   const username = req.body.username;
//   const password = req.body.password;
//
//   User.findOne({email: username}, function(err, foundUser){
//     if(err){
//       console.log(err);
//     }else{
//       if(foundUser){
//         bcrypt.compare(req.body.password, foundUser.password, function(err, result){
//           if(result === true){
//             res.render("secrets");
//           }
//         })
        //for below Level 4
        // if(foundUser.password === password){
        // res.render("secrets");
        // }
//       }
//     }
//
//
//   });
// });









app.listen(3000, function() {
  console.log("Server started on port 3000");
});
