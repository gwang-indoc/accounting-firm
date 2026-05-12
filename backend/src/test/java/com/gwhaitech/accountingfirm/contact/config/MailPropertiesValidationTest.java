package com.gwhaitech.accountingfirm.contact.config;

import org.junit.jupiter.api.Test;
import org.springframework.boot.context.properties.bind.BindException;
import org.springframework.boot.context.properties.bind.Bindable;
import org.springframework.boot.context.properties.bind.Binder;
import org.springframework.boot.context.properties.bind.validation.ValidationBindHandler;
import org.springframework.boot.context.properties.source.ConfigurationPropertySources;
import org.springframework.core.env.MapPropertySource;
import org.springframework.core.env.MutablePropertySources;
import org.springframework.validation.beanvalidation.SpringValidatorAdapter;

import jakarta.validation.Validation;
import jakarta.validation.Validator;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertThrows;

class MailPropertiesValidationTest {

    @Test
    void missingNotificationEmailPreventsStartup() {
        // Build a binder with a validator to simulate @Validated @ConfigurationProperties
        Validator validator = Validation.buildDefaultValidatorFactory().getValidator();
        SpringValidatorAdapter springValidator = new SpringValidatorAdapter(validator);
        ValidationBindHandler handler = new ValidationBindHandler(springValidator);

        MutablePropertySources sources = new MutablePropertySources();
        sources.addLast(new MapPropertySource("test", Map.of()));
        Binder binder = new Binder(ConfigurationPropertySources.from(sources));

        // bindOrCreate creates an instance with null notificationEmail, then validation fires
        // @NotBlank on notificationEmail should cause BindException
        assertThrows(BindException.class, () ->
            binder.bindOrCreate("contact", Bindable.of(MailProperties.class), handler)
        );
    }
}
