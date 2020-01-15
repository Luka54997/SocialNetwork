var express = require('express');
var path = require('path');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var neo4j = require('neo4j-driver');


var app = express();


app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/assets', express.static('assets'));

var driver = neo4j.driver("bolt://localhost", neo4j.auth.basic("neo4j", "123456"));
var session = driver.session();



app.get('/',(req,res)=>{    
    session
        .run("MATCH (n:Person) RETURN n")
        .then(function(result){
            var personArray = [];


            result.records.forEach((record)=>{
                //console.log(record._fields[0]);

                personArray.push({
                    id: record._fields[0].identity.low,
                    name: record._fields[0].properties.name 
                });
            });

            session
                .run("MATCH (n:Location) RETURN n")
                .then((result2)=>{
                    var locationArray = [];
                    result2.records.forEach((record)=>{
                        locationArray.push(record._fields[0].properties);
                    });

                    res.render("index",{
                        persons: personArray,
                        locations: locationArray
                    });

                })

            

        })
        .catch((error)=>{
            console.log(error);
        });          


});

app.post('/person/add', (req, res)=>{
    var name = req.body.name;
    if(name == "")
    {
        res.render("alert");
       
    }
    else
    {

        session
        .run("CREATE(n:Person {name:{nameParam}}) RETURN n.name", {nameParam: name})
        .then((result)=>{
            res.redirect('/');
            
        })
        .catch((error)=>{
            console.log(error);
        });
       

    }
    

        

        
});



app.post('/location/add',(req,res)=>{

    var city = req.body.city;
    var state = req.body.state;

    session
        .run("CREATE(n:Location {city:{cityParam}, state:{stateParam}}) RETURN n",{cityParam:city,stateParam:state})
        .then((result)=>{
            res.redirect('/');
        })
        .catch((error)=>{
            console.log(error);
        });
   

});


app.post('/friends/add',(req,res)=>{

    var name1 = req.body.name1;
    var name2 = req.body.name2;

    session
        .run("MATCH(a:Person {name:{name1Param}}),(b:Person {name:{name2Param}}) MERGE(a)-[r:FRIENDS]->(b) RETURN a,b",{name1Param:name1,name2Param:name2})
        .then((result)=>{
            res.redirect('/');
        })
        .catch((error)=>{
            console.log(error);
        });
   

});

app.post('/add',(req,res)=>{
    var id = req.body.id
    var name = req.body.name;
    var city = req.body.city;
    var state = req.body.state;
    var year = req.body.year;
    

    session
        .run("MATCH(a:Person {name:{nameParam}}),(b:Location {city:{cityParam}, state:{stateParam}}) MERGE(a)-[r:BORN_IN {year:{yearParam}}]->(b) RETURN a,b",{nameParam:name,cityParam:city,stateParam:state,yearParam:year})
        .then((result)=>{
            if(id && id != null){
                res.redirect('person/'+ id);
            }else{
                res.redirect('/');
            }
            
        })
        .catch((error)=>{
            console.log(error);
        });
   

});

app.get('/person/:id',(req,res)=>{
    var id =req.params.id;
    
    session
        .run("MATCH (a:Person) WHERE id(a)=toInt({idParam}) RETURN a.name as name",{idParam:id})
        .then((result)=>{
            var name = result.records[0].get("name");

            session
                .run("OPTIONAL MATCH (a:Person)-[r:BORN_IN]-(b:Location) WHERE id(a)=toInt({idParam}) RETURN b.city as city, b.state as state",{idParam:id})
                .then((result2)=>{
                    var city = result2.records[0].get("city");
                    var state = result2.records[0].get("state");

                    session
                        .run("OPTIONAL MATCH (a:Person)-[r:FRIENDS]-(b:Person) WHERE id(a)=toInt({idParam}) RETURN b",{idParam:id})
                        .then((result3)=>{
                          var friendsArray = [];
                          result3.records.forEach((record)=>{
                              if(record._fields[0] != null)
                              {
                                  friendsArray.push({
                                    id: record._fields[0].identity.low,
                                    name:record._fields[0].properties.name
                                  });
                              }

                          })  

                          res.render("person",{
                              id:id,
                              name:name,
                              city:city,
                              state:state,
                              friends:friendsArray  

                          });
                        })
                        .catch((error)=>{
                            console.log(error);
                        });
                })


        }) 
    


});

app.listen(4000);

console.log("Server started on port 4000");

module.exports = app;

