package com.restaurant.common.security;

import jakarta.servlet.Filter;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Spring Boot tự động đăng ký MỌI bean {@code Filter} (bao gồm {@code @Component} implement
 * {@code OncePerRequestFilter}) thẳng vào servlet container qua {@code ServletContextInitializerBeans}
 * — ĐỘC LẬP với việc {@code SecurityConfig.securityFilterChain} đã thêm chính bean đó vào
 * {@code SecurityFilterChain} bằng {@code addFilterBefore}.
 * <p>
 * Hệ quả: {@link JwtAuthFilter} chạy HAI LẦN cho mỗi request (một lần do container tự gọi,
 * một lần do Spring Security chain gọi).
 * <p>
 * Tắt auto-registration bằng {@code FilterRegistrationBean.setEnabled(false)} — giữ bean vẫn
 * tồn tại trong context (SecurityConfig vẫn autowire được) nhưng KHÔNG cho container tự gọi nó
 * ngoài đường Spring Security chain.
 */
@Configuration
public class FilterAutoRegistrationConfig {

    @Bean
    public FilterRegistrationBean<Filter> disableAutoRegistrationForJwtAuthFilter(JwtAuthFilter filter) {
        FilterRegistrationBean<Filter> registration = new FilterRegistrationBean<>(filter);
        registration.setEnabled(false);
        return registration;
    }
}
