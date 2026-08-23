package com.example.englishapp_server.service;

import com.google.genai.Client;
import com.google.genai.types.Content;
import com.google.genai.types.GenerateContentResponse;
import com.google.genai.types.Part;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class CaptionTranslationService {
    private static final Logger log = LoggerFactory.getLogger(CaptionTranslationService.class);

    private final String apiKey;
    private final String model;

    public CaptionTranslationService(@Value("${gemini.api-key:}") String apiKey,
                                     @Value("${gemini.transcription-model:gemini-3.6-flash}") String model) {
        this.apiKey = apiKey == null ? "" : apiKey.trim();
        this.model = model == null || model.isBlank() ? "gemini-3.6-flash" : model.trim();
    }

    public String translateCaption(String text) {
        if (apiKey.isBlank()) {
            throw new IllegalStateException("GEMINI_API_KEY is not configured for translation.");
        }
        if (text == null || text.isBlank()) {
            return "";
        }

        try {
            String prompt = "Translate the following English sentence to natural Vietnamese, keeping the educational context intact. " +
                            "Return only the translated sentence, without any explanation or markdown formatting:\n\n" + text;
            
            Client client = Client.builder().apiKey(apiKey).build();
            GenerateContentResponse response = client.models.generateContent(
                    model, 
                    Content.fromParts(Part.fromText(prompt)), 
                    null
            );
            
            String translation = response.text();
            return translation == null ? "" : translation.trim();
        } catch (RuntimeException exception) {
            log.warn("Gemini translation failed. model={}, error={}", model, exception.getMessage());
            throw new IllegalStateException("Gemini could not translate the text right now.");
        }
    }
}
