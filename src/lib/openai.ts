// this file creates an openai object that can be called from anywhere in the app
import OpenAI from 'openai'


export const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
})