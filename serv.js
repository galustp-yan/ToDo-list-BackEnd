require('dotenv').config();
const   express = require('express'),
        mysql = require('mysql2/promise'),
        session = require('express-session'),
        passport = require('passport'),
        GoogleStrategy = require('passport-google-oauth20').Strategy,
        path = require('path'),
        crypto = require('crypto'),
        jwt = require("jsonwebtoken");


const app = express();
///////////////// react + node
const cors = require('cors');
// const corsOptions = {
//     origin: 'http://localhost:3000',
//     optionsSuccessStatus: 200,
//   };
app.use(cors()); 
///////////////

//db connection setting
const connectionSetting = {
    host: process.env.HOST,
    user: process.env.USER,
    password: process.env.PASSWORD,
    database: process.env.DATABASE,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
}


//random simbol genertor
function generateRandomString(length) {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const bytes = crypto.randomBytes(length);
  let result = '';
  for (let i = 0; i < length; i++) {
    const index = bytes[i] % characters.length;
    result += characters[index];
  }
  return result;
}

const randomString = generateRandomString(32);

// Set up session middleware
app.use(session({
    secret: randomString,
    resave: false,
    saveUninitialized: true,
    cookie: { secure: true } // Set to true for HTTPS
}));

// Initialize Passport and restore authentication state, if any, from the session
app.use(passport.initialize());
app.use(passport.session());
app.use(express.json());
// Configure Google OAuth2.0 Strategy
passport.use(new GoogleStrategy({
    clientID: process.env.CLIENTID,
    clientSecret: process.env.CLIENTSECRET,
    callbackURL: `https://todo-list-backend-xvuj.onrender.com/auth/google/callback`
}, (accessToken, refreshToken, profile, done) => {
    // This function is called after successful authentication
    // You can perform database operations here to store user data
    return done(null, profile);
}));

// Serialize user into the session
passport.serializeUser((user, done) => {
    done(null, user);
});

// Deserialize user from the session
passport.deserializeUser((obj, done) => {
    done(null, obj);
});

// Define the authentication route
// debugger;
app.get('/auth/google',
     passport.authenticate('google', { scope: ['profile', 'email'] })
);

// Define the callback route
app.get('/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/login' }),
    (req, res) => {
        // Successful authentication, redirect home
        // const connectionPool = mysql.createPool(connectionSetting);
    
        console.log(req.user.name.givenName + " " + req.user.name.familyName);
        const userData = {
            name: req.user.name.givenName,
            surName: req.user.name.familyName,
            email: req.user._json.email,
            password: null,
            img: null
        }
        const connectionPool = mysql.createPool(connectionSetting);
    
        const createTableQuery = `CREATE TABLE IF NOT EXISTS users (
        id int NOT NULL AUTO_INCREMENT,
        name varchar(45) NOT NULL,
        surName varchar(45) NOT NULL,
        email varchar(45) NOT NULL,
        password varchar(45) NULL,
        img longtext,
        PRIMARY KEY (id),
        UNIQUE KEY email_UNIQUE (email)
        ) ENGINE=MyISAM DEFAULT CHARSET=utf8mb3;`;
    
        const insertUserQuery = `INSERT INTO users (name, surName, email, password, img) VALUES (?, ?, ?, ?, ?)`;
        const forUserDataQuery = Object.values(userData);
    
        const token = jwt.sign({ secretKey: randomString, email: userData.email }, randomString, { expiresIn: '1h' });
        req.session.email = userData.email;
        (async () => {
            try {
                const connection = await connectionPool.getConnection();
                
                // Create table (if it doesn't exist)
                await connection.query(createTableQuery);
                console.log('Table created (if it didn\'t exist already).');
                
                // Insert user data
                const [insertResult] = await connection.query(insertUserQuery, forUserDataQuery);
                console.log('User inserted with ID:', insertResult.insertId);
                
                // Log inserted data using SELECT
                const userId = insertResult.insertId;
                const selectUserQuery = `SELECT * FROM users WHERE id = ?`;
                const [selectResult] = await connection.query(selectUserQuery, [userId]);
    
                console.log('Inserted User:', selectResult); // Access the first row (inserted user)
    
                await connection.release();
                res.cookie('email', userData.email, { maxAge: 600000, secure: true });
                res.redirect(`https://tonationdo.netlify.app/home?t=${encodeURIComponent(token)}&e=${encodeURIComponent(userData.email)}`) // `/home?t=${encodeURIComponent(token)}`
                console.log('Connection released!');
            } catch (error) {
                if(error.sqlMessage === `Duplicate entry '${userData.email}' for key 'users.email_UNIQUE'`
                   ||  error.sqlMessage === `Duplicate entry '${userData.email}' for key 'email_UNIQUE'`
                ){
                    req.session.email = userData.email;
                    res.cookie('email', userData.email, { maxAge: 600000, secure: true });
                    res.redirect(`https://tonationdo.netlify.app/home?t=${encodeURIComponent(token)}&e=${encodeURIComponent(userData.email)}`)
                } else
                    console.log(error.message);
            } finally {
                await connectionPool.end();
                // console.log(randomString);
                console.log('Connection pool closed!');
            }
        })();
});



// var xPath = "build"
// app.use(express.static(path.join("C:\\Users\\galus\\Desktop\\todo", xPath)));
// // app.get('/signIN', (req, res) => {
// //     res.sendFile(path.join("C:\\Users\\galus\\Desktop\\todo", xPath, 'index.html'));
// //   });
// app.get('/signIN', (req, res) => {
//     // req.session.email = "drfhgjk";
//     if (!req.session.email) {
//         res.sendFile(path.join("C:\\Users\\galus\\Desktop\\todo", xPath, 'index.html'));
//     } else {
//         res.redirect('/home');

//     }
// });
// app.get('/signUP', (req, res) => {
//     if (!req.session.email) {
//         res.sendFile(path.join("C:\\Users\\galus\\Desktop\\todo", xPath, 'index.html'));
//     } else {
//         res.redirect('/home');
//     }
// });

app.get('/home', (req, res) => {
    if (req.isAuthenticated()) {
        if(req.session.email == undefined){
            req.session.email = Object.values(req.user)[3][0].value;
            res.sendFile(path.join("C:\\Users\\galus\\Desktop\\todo", "build", 'index.html'));
            // console.log(req.session.email);
        } 
    } else if (req.session.email) {
        res.sendFile(path.join("C:\\Users\\galus\\Desktop\\todo", "build", 'index.html'));
    } else
        res.redirect("/signIN")
});

app.get('/', function (req, res) {
    req.session.destroy((err) => { // Handle potential errors
        if (err) {
          console.error(err);
          return res.status(500).send('Error logging out!');
        }
    
        res.clearCookie('session'); // Clear the session cookie (optional)
        req.session = null; // Remove data from session object
        res.cookie('session', '', { maxAge: 0 });
        res.send('Successfully logged out!');
      });
});

app.post('/checkSession', (req, res) => {
    try{
        const token = req.body.headers.Authorization;
        const email = req.body.cookieEmail;
        const verified = jwt.verify(token, randomString);
        console.log(verified);
        if (email === verified.email) {
            const token = jwt.sign({ secretKey: randomString, email: email }, randomString, { expiresIn: '1h' });
            // res.json({err: false})
            res.json({ token: token, email: email, err: false });
        } else {
            res.json({err: true})
        }
    } catch (err){
        res.json({err: true})
    }
});

//example 
app.post('/example',  (req, res) => {
    const randomString = generateRandomString(32);
    const token = jwt.sign({ secretKey: randomString, email:  ""}, randomString, { expiresIn: '1h' });
    res.json({token: token})
});


// get Dte function
function getCurrentDateForMySQL() {
    const currentDate = new Date();
  
    // Get year, month (0-indexed), and day
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0'); // Add leading zero if needed
    const day = String(currentDate.getDate()).padStart(2, '0');
  
    // Format the date as YYYY-MM-DD
    const mysqlDate = `${year}-${month}-${day}`;
  
    return mysqlDate;
}
  
///delete task from db
app.post('/deleteTask', (req, res) => {
    const taskData = {
        id: req.body.id
    }
    const connectionPool = mysql.createPool(connectionSetting);
    
    (async () => {
        try {
            const connection = await connectionPool.getConnection();

            // Log inserted data using Delete
            const selectTaskQuery = `DELETE FROM taskdb WHERE id = ?;`;
            const [deleteResult] = await connection.query(selectTaskQuery, [taskData.id]);
            
            if (deleteResult.affectedRows === 0) {
                throw new Error('Task not found!');
              }
            
            await connection.release();
            res.json({success: "Successfully!!!"});
            console.log('Connection released!');
        } catch (error) {
            if (error.message === "Task not found!") {
                res.json({errorMes: error.message})
            } else 
                console.log(error.message);
        } finally {
            await connectionPool.end();
            console.log('Connection pool closed!');
        }
    })();
});

//change task checked
app.post('/changChecked', (req, res) => {
    const taskData = {
        id: req.body.id
    }
    console.log(taskData.id);
    const connectionPool = mysql.createPool(connectionSetting);
    
    (async () => {
        try {
            const connection = await connectionPool.getConnection();

            // Log inserted data using SELECT
            const selectTaskQuery = `UPDATE taskdb SET checked=checked XOR 1 WHERE id = ?;`;
            const [updateResult] = await connection.query(selectTaskQuery, [taskData.id]);
            
            if (updateResult.affectedRows === 0) {
                throw new Error('Task not found!');
              }
            
            await connection.release();
            res.json({success: "Successfully!!!"});
            console.log('Connection released!');
        } catch (error) {
            if (error.message === "Task not found!") {
                res.json({errorMes: error.message})
            } else 
                console.log(error.message);
        } finally {
            await connectionPool.end();
            console.log('Connection pool closed!');
        }
    })();
});

// get task from db
app.post('/getTask', (req, res) => {
    const userData = {
        email: req.body.cookieEmail
    }
    const connectionPool = mysql.createPool(connectionSetting);
    
    (async () => {
        try {
            const connection = await connectionPool.getConnection();

            // Log inserted data using SELECT
            const selectTaskQuery = `SELECT * FROM taskdb WHERE email = ?`;
            const [selectResult] = await connection.query(selectTaskQuery, [userData.email]);
            
            if(selectResult.length === 0)
                throw new Error("Task does not exist!");
            
            await connection.release();
            res.json(selectResult);
            console.log('Connection released!');
        } catch (error) {
            if (error.message === "Task does not exist!") {
                res.json({errorMes: error.message})
            }
        } finally {
            await connectionPool.end();
            console.log('Connection pool closed!');
        }
    })();
});

// add new tasks
app.post('/addTask', async function (req, res) {
    try {
        const token = req.body.headers.Authorization;
        const email = req.body.cookieEmail;
        const verified = jwt.verify(token, randomString);
        if (email !== verified.email) {res.json({errorMessFromBack: "Refresh the page and try again."})}
        const date = getCurrentDateForMySQL();
        const userData = {
            email: req.body.cookieEmail,
            text: req.body.task.text,
            checked: req.body.task.checked,
            date: date
        }

        let emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if(!emailRegex.test(userData.email) || userData.text.trim() === "" )
            console.log("Wrong");
        else {
            
            const connectionPool = mysql.createPool(connectionSetting);
        
            const createTableQuery = `CREATE TABLE IF NOT EXISTS taskdb (
                id INT NOT NULL AUTO_INCREMENT,
                email VARCHAR(45) NOT NULL,
                text VARCHAR(45) NOT NULL,
                checked TINYINT NOT NULL,
                date DATE NOT NULL,
                PRIMARY KEY (id))
                ENGINE=MyISAM DEFAULT CHARSET=utf8mb3;`;
    
            const insertTaskQuery = `INSERT INTO taskdb (email, text, checked, date) VALUES (?, ?, ?, ?)`;
            const forTaskDataQuery = Object.values(userData);
            
            (async () => {
                try {
                    const connection = await connectionPool.getConnection();
        
                    // Create table (if it doesn't exist)
                    await connection.query(createTableQuery);
                    console.log('Table created (if it didn\'t exist already).');
        
                    // Insert user data
                    const [insertResult] = await connection.query(insertTaskQuery, forTaskDataQuery);
                    console.log('User inserted with ID:', insertResult.insertId);
        
                    // Log inserted data using SELECT
                    const userId = insertResult.insertId;
                    const selectUserQuery = `SELECT * FROM taskdb WHERE id = ?`;
                    const [selectResult] = await connection.query(selectUserQuery, [userId]);
        
                    console.log('Inserted User:', selectResult); // Access the first row (inserted user)
        
                    await connection.release();
                    res.json(selectResult[0])
                    console.log('Connection released!');
                } catch (error) {
                    console.log(error);
                } finally {
                    await connectionPool.end();
                    console.log('Connection pool closed!');
                }
            })();
        }

    } catch (e) {
        res.json({errorMessFromBack: "Refresh the page and try again."})
    }
});

//authorization user
app.post('/authorization', (req, res) => {
    const userData = {
        email: req.body.email,
        password: req.body.password
    }
    const connectionPool = mysql.createPool(connectionSetting);
    
    (async () => {
        try {
            const connection = await connectionPool.getConnection();

            // Log inserted data using SELECT
            const selectUserQuery = `SELECT * FROM users WHERE email = ? AND password = ?`;
            const [selectResult] = await connection.query(selectUserQuery, [userData.email, userData.password]);
            
            if(selectResult.length === 0)
                throw new Error("User does not exist!");
            
            await connection.release();
            req.session.email = userData.email;
            // res.json(selectResult[0])
            const token = jwt.sign({ secretKey: randomString, email: userData.email }, randomString, { expiresIn: '1h' });
            res.json({ token: token, email: userData.email });
            console.log('Connection released!');
        } catch (error) {
            if(error.message === `User does not exist!`){
                res.json({errorMessFromBack: `User does not exist!`})
            } else
                res.json({errorMessFromBack: "Please refresh the page and try again․"})

        } finally {
            await connectionPool.end();
            console.log('Connection pool closed!');
        }
    })();
});

//create new user 
app.post('/create', async function (req, res) {
    try {
        const userData = {
            name: req.body.name,
            surName: req.body.surName,
            email: req.body.email,
            password: req.body.password,
            img: null
        }

        let passwordRegex = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[.!#$%&'*+/=?^_`{|}~-])[A-Za-z\d.!#$%&'*+/=?^_`{|}~-]{8,}$/;
        let emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if( userData.name.length < 2 || 
            userData.surName.length < 2 ||
            !emailRegex.test(userData.email) ||
            !passwordRegex.test(userData.password)
        )
        console.log("Wrong");
        else {
            
            const connectionPool = mysql.createPool(connectionSetting);
            
            const createTableQuery = `CREATE TABLE IF NOT EXISTS users (
            id int NOT NULL AUTO_INCREMENT,
            name varchar(45) NOT NULL,
            surName varchar(45) NOT NULL,
            email varchar(45) NOT NULL,
            password varchar(45) NOT NULL,
            img longtext,
            PRIMARY KEY (id),
            UNIQUE KEY email_UNIQUE (email)
        ) ENGINE=MyISAM DEFAULT CHARSET=utf8mb3;`;
        
        const insertUserQuery = `INSERT INTO users (name, surName, email, password, img) VALUES (?, ?, ?, ?, ?)`;
            const forUserDataQuery = Object.values(userData);
        
            (async () => {
                try {
                    const connection = await connectionPool.getConnection();
        
                    // Create table (if it doesn't exist)
                    await connection.query(createTableQuery);
                    console.log('Table created (if it didn\'t exist already).');
        
                    // Insert user data
                    const [insertResult] = await connection.query(insertUserQuery, forUserDataQuery);
                    console.log('User inserted with ID:', insertResult.insertId);
        
                    // Log inserted data using SELECT
                    const userId = insertResult.insertId;
                    const selectUserQuery = `SELECT * FROM users WHERE id = ?`;
                    const [selectResult] = await connection.query(selectUserQuery, [userId]);
        
                    console.log('Inserted User:', selectResult); // Access the first row (inserted user)
        
                    await connection.release();
                    req.session.email = userData.email;
                    // let randomStringKey = generateRandomString(32);
                    // console.log(randomStringKey);
                    const token = jwt.sign({ secretKey: randomString, email: userData.email }, randomString, { expiresIn: '1h' });
                    res.json({ token: token, email: userData.email });
                    // res.json(selectResult[0])
                    console.log('Connection released!');
                } catch (error) {
                    if(error.sqlMessage === `Duplicate entry '${userData.email}' for key 'users.email_UNIQUE'`
                       || error.sqlMessage === `Duplicate entry '${userData.email}' for key 'email_UNIQUE'` 
                    ){
                        res.json({errorMessFromBack: `Duplicate entry '${userData.email}'`})
                    } else
                        console.log(error.sqlMessage);

                } finally {
                    await connectionPool.end();
                    console.log('Connection pool closed!');
                }
            })();
        }

    } catch (e) {
        res.json({errorMessFromBack: "Please refresh and try again."})
    }
    
});

// Start the server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});