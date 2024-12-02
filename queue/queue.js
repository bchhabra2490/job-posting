const Queue = require('bull');
const openAIService = require('../services/openAI');
const supabase = require('../services/supabase');
const Prompts = require('../constants');

const embeddingQueue = new Queue('embedding Queue')

embeddingQueue.process(function(job, done){

    const recordId = job.data.recordId

    openAIService.getGeneratedText(job.data.text, Prompts.resumeDetails).then(generatedText=>{
        console.log("Generated Text: ", generatedText);

        const startIndex = generatedText.indexOf('{')
        const endIndex = generatedText.length - 1

        const json = generatedText.substring(startIndex, endIndex)

        const details = JSON.parse(json);

        openAIService.getEmbedding(job.data.text).then(async response=>{            
            await supabase.from('resumes').update({
                generated_text: generatedText,
                generated_text_embedding: response,
                years_of_experience: details['total_years_of_experience']
            }).eq('id', recordId)

            const resume_details = []
            details['skillwise_years_of_experience'].forEach(skillwise_years_of_experience=>{
                resume_details.push(
                    {
                        tag_type: 'skill',
                        tag_value: skillwise_years_of_experience["skill"],
                        years: skillwise_years_of_experience["years_of_experience"],
                        resume_id: recordId
                    }
                )
            })

            details['industry_wise_years_of_experience'].forEach(industry_wise_years_of_experience=>{
                resume_details.push(
                    {
                        tag_type: 'industry',
                        tag_value: industry_wise_years_of_experience["industry"],
                        years: industry_wise_years_of_experience["years_of_experience"],
                        resume_id: recordId
                    }
                )
            })

            details['qualification'].forEach(qualification=>{
                resume_details.push(
                    {
                        tag_type: 'qualification',
                        tag_value: qualification,
                        years: null,
                        resume_id: recordId
                    }
                )
            })

            const {data, error} = await supabase.from('resume_details').insert(resume_details)
            console.log(error, data)
            done()
        })
    })
})

module.exports = embeddingQueue