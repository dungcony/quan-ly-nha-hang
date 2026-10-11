package com.restaurant.common.security;

import jakarta.servlet.DispatcherType;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.autoconfigure.security.servlet.PathRequest;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

/**
 * SecurityFilterChain STATELESS — không session, xác thực hoàn toàn qua JWT mỗi request.
 * Endpoint /auth/* (đăng ký, đăng nhập, xác thực email, quên và đặt lại mật khẩu), thực đơn, kiểm tra bàn trống và
 * đặt bàn công khai; còn lại yêu cầu Bearer token hợp lệ.
 * <p>
 * {@code exceptionHandling(authenticationEntryPoint)} BẮT BUỘC: thiếu nó thì request
 * thiếu/hỏng token trả 403 (anonymous → AccessDeniedException) thay vì 401, và
 * {@code GlobalExceptionHandler.handleAuthentication} không bao giờ chạy vì Spring Security
 * xử lý lỗi xác thực ngay trong filter chain, trước DispatcherServlet.
 */
@Configuration
@EnableWebSecurity
@org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthFilter jwtAuthFilter;
    private final JwtAuthenticationEntryPoint authenticationEntryPoint;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http.csrf(csrf -> csrf.disable())
                .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        .dispatcherTypeMatchers(DispatcherType.ASYNC, DispatcherType.ERROR).permitAll()
                        .requestMatchers(
                                PathRequest.toStaticResources().atCommonLocations()
                        ).permitAll()
                        .requestMatchers(
                                "/", "/index.html", "/*.html",
                                "/static/**", "/pages/**", "/css/**", "/js/**", "/sass/**",
                                "/auth/register", "/auth/login",
                                "/auth/forgot-password", "/auth/reset-password",
                                "/auth/verify-email", "/auth/resend-verification")
                        .permitAll()
                        // Ảnh đã tải lên (ảnh món, ảnh đại diện) hiển thị công khai cho Khách.
                        .requestMatchers("/files/**").permitAll()
                        // Khách xem thực đơn, kiểm tra bàn trống và đặt bàn không cần đăng nhập
                        // (docs/design/menu-management/api.md, docs/design/reservation/api.md).
                        .requestMatchers(HttpMethod.GET, "/menu/categories", "/menu/dishes", "/menu/dishes/*", "/reservations/availability").permitAll()
                        .requestMatchers(HttpMethod.POST, "/reservations").permitAll()
                        .anyRequest().authenticated())
                .exceptionHandling(ex -> ex.authenticationEntryPoint(authenticationEntryPoint))
                .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class)
                .cors(Customizer.withDefaults());
        return http.build();
    }


    // 2. Thêm Bean corsConfigurationSource vào SecurityConfig:
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        // Cho phép các domain frontend khi dev (hoặc lấy từ file cấu hình application.yml)
        configuration.setAllowedOriginPatterns(List.of(
                "*"
        ));
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(List.of("Authorization", "Content-Type", "X-Requested-With", "Accept", "Origin"));
        configuration.setExposedHeaders(List.of("Authorization")); // Cho phép frontend đọc header Authorization nếu cần
        configuration.setAllowCredentials(true);
        configuration.setMaxAge(3600L);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(10);
    }
}
