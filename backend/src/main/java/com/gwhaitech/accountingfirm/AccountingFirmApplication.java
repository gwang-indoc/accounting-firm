package com.gwhaitech.accountingfirm;

import com.gwhaitech.accountingfirm.storage.StorageProperties;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;

@SpringBootApplication
@EnableConfigurationProperties(StorageProperties.class)
public class AccountingFirmApplication {
    public static void main(String[] args) {
        SpringApplication.run(AccountingFirmApplication.class, args);
    }
}
