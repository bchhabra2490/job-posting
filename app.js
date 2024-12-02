const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const bodyParser = require('body-parser')
require('dotenv').config()
const parsePDF = require('./utils/parsePDF');
const embeddingQueue = require('./queue/queue');
const supabase = require('./services/supabase');
const openAIService = require('./services/openAI');
const Prompts = require('./constants');

// Initialize the app
const app = express();

app.use(bodyParser.json())

// Set up multer for file storage
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadPath = 'uploads/';
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath);  // Create the folder if it doesn't exist
    }
    cb(null, uploadPath);  // Folder to store uploaded files
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));  // Unique filename
  }
});

// Initialize multer with the storage config
const upload = multer({ storage });

// Route to handle file upload
app.post('/upload', upload.single('file'), async (req, res) => {
  console.log(req.filename, req.body)
  if (!req.file) {
    return res.status(400).send('No file uploaded.');
  }

  if (req.file.mimetype !== 'application/pdf') {
    return res.status(400).send('Only PDF files are allowed.');
  }

  try {
    const filePath = req.file.path;  // Path to the uploaded PDF
    const filename = req.file.filename
    const { data, error } = await supabase.storage.from('CandidateSearch').upload(filename, fs.readFileSync(filePath), {upsert: true, contentType: "application/pdf"})
    
    parsePDF(filePath).then(async (parsedData)=>{
      console.log(parsedData.text.replace(/[^\x00-\x7F]/g, ""))
      const { data: dbData, error } = await supabase.from('resumes').insert({ url: data.id + '/' + data.fullPath, parsed_text: parsedData.text.replace(/[^\x00-\x7F]/g, "").replaceAll(/\u0000/g, "") }).select()
      console.log(error)
      embeddingQueue.add({ text: parsedData.text, recordId: dbData[0].id });
      try{
        fs.unlink(filePath, ()=>{
            res.status(200).send({
              message: 'File uploaded and parsed successfully!',
            });
          })
        }catch(e){
          console.log("Error deleting file", e.message)
          res.status(200).send({
            message: 'File uploaded and parsed successfully!',
          });
        }
    })
  } catch (error) {
    console.log(error)
    res.status(500).send('Error parsing PDF file.');
  }
});

app.get('/resumes', (req, res)=>{
  const input = req.query.input

  openAIService.getEmbedding(input).then(async response=>{   
    console.log(response);
    const {data, error} = await supabase.rpc('search_resumes', { query_embedding: response, total_count: 2 })
        
    res.status(200).json({
      data:data,
      error: error
    })
  })
})

app.get('/job/:id/resumes/', async (req, res)=>{
  const jobId = req.params.id

  const {data, error} = await supabase.from('job_details').select('*, jobs(*)').eq('jobs.id', jobId)

  const industryRequirements = data.filter(d=> d.requirement_type === 'industry').map(d=> d.requirement_value)
  const skillRequirements = data.filter(d=> d.requirement_type === 'skill').map(d=> d.requirement_value)

  let {data: applicationsResumes, error: e} = await supabase.from('applications').select('resume_id').eq('job_id', jobId)
  
  const appliedResumeIds = applicationsResumes.map(ar=>ar.resume_id)

  let query = supabase.from('resume_details').select('resume_id, resumes(parsed_text)')

  query = query.in('tag_value', industryRequirements.concat(skillRequirements))
  if(appliedResumeIds.length > 0){ 
    query = query.in('resumes.id', appliedResumeIds)
  }

  console.log(query)

  const {data: finalData, error: err} = await query;
  console.log(finalData, err)

  res.status(200).json({
    data: finalData
  })
})

app.post('/job', async (req, res)=>{
  const title = req.body.title;
  const description = req.body.description
  const companyId = req.body.companyId

  const { data, error } =  await supabase.from('jobs').insert({
    title: title,
    description: description,
    company_id: companyId,
  }).select()

  console.log(data);
  const recordId = data[0].id

  openAIService.getGeneratedText(description, Prompts.jobDescription).then(async generatedText=>{
    console.log("Generated Text: ", generatedText);

    const startIndex = generatedText.indexOf('{')
    const endIndex = generatedText.length - 1

    const json = generatedText.substring(startIndex, endIndex)
    console.log(json)

    const details = JSON.parse(json);

    const requiredYearsOfExperience = details["total_years_of_experience"]

    await supabase.from('jobs').update({
      required_years_of_experience: requiredYearsOfExperience
    }).eq('id', recordId)

    const jobDetails = []
    details['industries'].forEach(industry=>{
      jobDetails.push({
        job_id: recordId,
        requirement_type: 'industry',
        requirement_value: industry
      })
    })

    details['qualification'].forEach(qualification=>{
      jobDetails.push({
        job_id: recordId,
        requirement_type: 'qualification',
        requirement_value: qualification
      })
    })

    details['skills'].forEach(skill=>{
      jobDetails.push({
        job_id: recordId,
        requirement_type: 'skill',
        requirement_value: skill
      })
    })

    details['locations'].forEach(location=>{
      jobDetails.push({
        job_id: recordId,
        requirement_type: 'location',
        requirement_value: location
      })
    })

    details['countries'].forEach(country=>{
      jobDetails.push({
        job_id: recordId,
        requirement_type: 'country',
        requirement_value: country
      })
    })

    await supabase.from('job_details').insert(jobDetails)

    res.status(200).json({
      data: null,
      message: 'Job added successfully'
    })
  })
})

// Start the server
const port = 3000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
