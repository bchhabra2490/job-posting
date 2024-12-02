const OpenAI = require('openai');  // Import OpenAI API

class OpenAIService{
    constructor(){
        this.client = new OpenAI({
            apiKey: process.env['OPEN_API_KEY'],
        });
    }

    async getEmbedding(input){
        try{
            if(process.env['SIMULATE_OPEN_AI_API'] === '1'){
                console.log("Returning Default Object - OpenAI API")
                return Promise.resolve([1,2,4])
            }

            const response = await this.client.embeddings.create({
                model: "text-embedding-ada-002",
                input: input,
                encoding_format: "float",
            });

            
            return response.data[0].embedding;
        }catch(e){
            console.log(`Error while generating embedding for ${input}: `, e.message)

            return null
        }
    }

    async getGeneratedText(input, promptTemplate){
        try{
            
            const prompt = promptTemplate.replace("{input}", input);

            const completion = await this.client.chat.completions.create({
                messages: [{ role: "system", content: prompt }],
                model: "gpt-4o",
            });

            return completion.choices[0].message.content

        }catch(e){
            console.log(`Error while generating text for ${input}: `, e.message)

            return null
        }
    }
}

const openAIService = new OpenAIService()

module.exports = openAIService