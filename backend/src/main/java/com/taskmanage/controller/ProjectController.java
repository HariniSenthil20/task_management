package com.taskmanage.controller;

import com.taskmanage.dto.ProjectDTO;
import com.taskmanage.service.ProjectService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/projects")
public class ProjectController {
    
    @Autowired
    private ProjectService projectService;

    @PostMapping("/workspace/{workspaceId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'PROJECT_MANAGER')")
    public ResponseEntity<ProjectDTO> createProject(@PathVariable Long workspaceId, @RequestBody Map<String, String> req) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        return ResponseEntity.ok(projectService.createProject(
            workspaceId, req.get("name"), req.get("description"), username
        ));
    }

    @GetMapping("/workspace/{workspaceId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'PROJECT_MANAGER', 'TEAM_MEMBER')")
    public ResponseEntity<List<ProjectDTO>> getWorkspaceProjects(@PathVariable Long workspaceId) {
        return ResponseEntity.ok(projectService.getProjectsByWorkspace(workspaceId));
    }

    @GetMapping("/{projectId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'PROJECT_MANAGER', 'TEAM_MEMBER')")
    public ResponseEntity<ProjectDTO> getProject(@PathVariable Long projectId) {
        return ResponseEntity.ok(projectService.getProjectById(projectId));
    }

    @PutMapping("/{projectId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'PROJECT_MANAGER')")
    public ResponseEntity<ProjectDTO> updateProject(@PathVariable Long projectId, @RequestBody Map<String, String> req) {
        return ResponseEntity.ok(projectService.updateProject(
            projectId, req.get("name"), req.get("description"), req.get("status"), req.get("startDate"), req.get("endDate")
        ));
    }

    @DeleteMapping("/{projectId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'PROJECT_MANAGER')")
    public ResponseEntity<?> deleteProject(@PathVariable Long projectId) {
        projectService.deleteProject(projectId);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/{projectId}/members/{userId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'PROJECT_MANAGER')")
    public ResponseEntity<?> addMember(@PathVariable Long projectId, @PathVariable Long userId) {
        projectService.addMemberToProject(projectId, userId);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/{projectId}/members/{userId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'PROJECT_MANAGER')")
    public ResponseEntity<?> removeMember(@PathVariable Long projectId, @PathVariable Long userId) {
        String currentUsername = SecurityContextHolder.getContext().getAuthentication().getName();
        projectService.removeMemberFromProject(projectId, userId, currentUsername);
        return ResponseEntity.ok().build();
    }
}
