const Prompts = {
    jobDescription: `Given the title and description of the job **{input}**
    Answer the following points - 
        1. What skills are required for the job
        2. Number of years of experience required.
        3. Industry which is linked to the job.
        4. qualification required by the job
        5. Location of the job
        6. Countries Allowed. Mention Global if no country is mentioned.

        in the following JSON format:
        {
            "industries": Array of String,
            "total_years_of_experience": Number,
            "skills": Array of String,
            "qualification": Array of String,
            "locations": Array of String,
            "countries": Array of String,
        }

        Strictly return the JSON format inside <> and do not use any other piece of text
  `,
    resumeDetails: `
                Given the following resume of a candidate: **{input}**
                Answer the following points -
                    1. What industries he worked in?
                    2. How many years of experience he has?
                    3. What skills the candidate possess?
                    4. What is the qualification of the candidate?
                    5. List down the years of experience for each industry the candidate has worked in?
                    6. Name of the companies the person worked in.

                in given json format - 
                {
                    "industries": Array of String,
                    "total_years_of_experience": Number,
                    "skills": Array of String,
                    "industry_wise_years_of_experience": Array of {"industry": String, "years_of_experience": Number},
                    "skillwise_years_of_experience": Array of {"skill": String, "years_of_experience": Number},
                    "qualification": Array of String,
                    "companies": Array of String,
                }

                Strictly return the JSON format inside <> and do not use any other piece of text

            `,
}

module.exports = Prompts