// const multer = require('multer');
// const path = require('path');

// const upload = multer({
//     storage: multer.diskStorage({
//       destination(req, file, cb) {
//         cb(null, './uploads/');
//       },
//       filename:(req, file, cb)=> {
//         cb(null, 'congar' + '-' + Date.now() + path.extname(file.originalname));

//       }
//     }),
//     limits: {
//       fileSize: 10000000 // max file size 1MB = 1000000 bytes
//     },
//     fileFilter:(req, file, cb)=> {
//       if (!file.originalname.match(/\.(jpeg|jpg|png|)$/)) {
//         return cb(
//           new Error(
//             'only upload files with jpg, jpeg, png, pdf, doc, docx, xslx, xls format.'
//           )
//         );
//       }
//       cb(undefined, true); // continue with upload
//     }
//   });





const multerS3 =require('multer-s3');
const aws =require ('aws-sdk');

const multer =require('multer')
const shortid=require('shortid')


//const accessKeyId = process.env.accessKeyId;
//const secretAccessKey = process.env.secretAccessKey;

const accessKeyId ='';
const secretAccessKey='';


const s3 = new aws.S3({
  accessKeyId,
  secretAccessKey,
});



const uploadS3 = multer({
  storage: multerS3({
    s3: s3,
    bucket:"jaymern",
    acl: "public-read",
    metadata: function (req, file, cb) {
      cb(null, { fieldName: file.fieldname });
    },
    key: function (req, file, cb) {
      cb(null, shortid.generate() + "-" + file.originalname);
    },
  }),
});



  module.exports=uploadS3
