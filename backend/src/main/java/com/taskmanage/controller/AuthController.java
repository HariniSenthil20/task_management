package com.taskmanage.controller;

import com.taskmanage.dto.request.LoginRequest;
import com.taskmanage.dto.request.SignupRequest;
import com.taskmanage.dto.response.JwtResponse;
import com.taskmanage.dto.response.MessageResponse;
import com.taskmanage.model.Role;
import com.taskmanage.model.User;
import com.taskmanage.model.enums.ERole;
import com.taskmanage.repository.RoleRepository;
import com.taskmanage.repository.UserRepository;
import com.taskmanage.security.jwt.JwtUtils;
import com.taskmanage.security.services.UserDetailsImpl;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/auth")
public class AuthController {
  @Autowired
  AuthenticationManager authenticationManager;

  @Autowired
  UserRepository userRepository;

  @Autowired
  RoleRepository roleRepository;

  @Autowired
  PasswordEncoder encoder;

  @Autowired
  JwtUtils jwtUtils;

  @PostMapping("/signin")
  public ResponseEntity<?> authenticateUser(@Valid @RequestBody LoginRequest loginRequest) {

    Authentication authentication = authenticationManager.authenticate(
        new UsernamePasswordAuthenticationToken(loginRequest.getUsername(), loginRequest.getPassword()));

    SecurityContextHolder.getContext().setAuthentication(authentication);
    String jwt = jwtUtils.generateJwtToken(authentication);
    
    UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();    
    String role = userDetails.getAuthorities().iterator().next().getAuthority();

    return ResponseEntity.ok(new JwtResponse(jwt, 
                         userDetails.getId(), 
                         userDetails.getUsername(), 
                         userDetails.getEmail(), 
                         role));
  }

  @PostMapping("/signup")
  public ResponseEntity<?> registerUser(@Valid @RequestBody SignupRequest signUpRequest) {
    if (userRepository.existsByUsername(signUpRequest.getUsername())) {
      return ResponseEntity
          .badRequest()
          .body(new MessageResponse("Error: Username is already taken!"));
    }

    if (userRepository.existsByEmail(signUpRequest.getEmail())) {
      return ResponseEntity
          .badRequest()
          .body(new MessageResponse("Error: Email is already in use!"));
    }

    // Create new user's account
    User user = new User();
    user.setUsername(signUpRequest.getUsername());
    user.setEmail(signUpRequest.getEmail());
    user.setPassword(encoder.encode(signUpRequest.getPassword()));

    String strRole = signUpRequest.getRole();
    Role userRole;

    if (strRole == null) {
      userRole = roleRepository.findByName(ERole.ROLE_TEAM_MEMBER)
          .orElseThrow(() -> new RuntimeException("Error: Role is not found."));
    } else {
      switch (strRole.toLowerCase()) {
      case "admin":
        userRole = roleRepository.findByName(ERole.ROLE_ADMIN)
            .orElseThrow(() -> new RuntimeException("Error: Role is not found."));
        break;
      case "manager":
        userRole = roleRepository.findByName(ERole.ROLE_PROJECT_MANAGER)
            .orElseThrow(() -> new RuntimeException("Error: Role is not found."));
        break;
      default:
        userRole = roleRepository.findByName(ERole.ROLE_TEAM_MEMBER)
            .orElseThrow(() -> new RuntimeException("Error: Role is not found."));
      }
    }

    user.setRole(userRole);
    userRepository.save(user);

    return ResponseEntity.ok(new MessageResponse("User registered successfully!"));
  }
}
