package com.currencyx.config;

import java.time.Clock;

import com.currencyx.service.DemoDataSeeder;
import com.currencyx.service.RateService;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.event.EventListener;
import org.springframework.dao.DataAccessException;
import org.springframework.scheduling.annotation.Scheduled;

/** Fetches rates at startup and periodically, and keeps demo data in line with configuration. */
@Configuration
public class SchedulingConfig {

    private static final Logger log = LoggerFactory.getLogger(SchedulingConfig.class);

    private final RateService rateService;
    private final DemoDataSeeder demoDataSeeder;

    public SchedulingConfig(RateService rateService, DemoDataSeeder demoDataSeeder) {
        this.rateService = rateService;
        this.demoDataSeeder = demoDataSeeder;
    }

    @Bean
    public static Clock clock() {
        return Clock.systemUTC();
    }

    @EventListener(ApplicationReadyEvent.class)
    public void onStartup() {
        rateService.refreshIfDue();
        reconcileDemoData();
    }

    @Scheduled(cron = "${app.refresh.cron}", zone = "UTC")
    public void scheduledRefresh() {
        rateService.refreshIfDue();
        reconcileDemoData();
    }

    private void reconcileDemoData() {
        try {
            demoDataSeeder.reconcile();
        } catch (DataAccessException e) {
            log.error("Could not reconcile demo data", e);
        }
    }
}
