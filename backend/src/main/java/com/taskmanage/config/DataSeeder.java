package com.taskmanage.config;

import com.taskmanage.model.Role;
import com.taskmanage.model.enums.ERole;
import com.taskmanage.repository.RoleRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

@Component
public class DataSeeder implements CommandLineRunner {

    @Autowired
    private RoleRepository roleRepository;

    @Override
    public void run(String... args) throws Exception {
        seedRoles();
    }

    private void seedRoles() {
        if (roleRepository.count() == 0) {
            Role admin = new Role();
            admin.setName(ERole.ROLE_ADMIN);
            roleRepository.save(admin);

            Role manager = new Role();
            manager.setName(ERole.ROLE_PROJECT_MANAGER);
            roleRepository.save(manager);

            Role member = new Role();
            member.setName(ERole.ROLE_TEAM_MEMBER);
            roleRepository.save(member);
            
            System.out.println("Roles seeded successfully.");
        }
    }
}
