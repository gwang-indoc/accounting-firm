package com.gwhaitech.accountingfirm.storage;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.nio.file.Path;

@Configuration
public class StorageConfig {

    @Bean
    Path uploadDir(StorageProperties props) {
        return props.uploadDir();
    }
}
