package com.taskmanage.controller;

import com.taskmanage.dto.WorkspaceDTO;
import com.taskmanage.service.WorkspaceService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/workspaces")
public class WorkspaceController {
    
    @Autowired
    private WorkspaceService workspaceService;

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<WorkspaceDTO> createWorkspace(@RequestBody Map<String, String> req) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        return ResponseEntity.ok(workspaceService.createWorkspace(
            req.get("name"), req.get("description"), username
        ));
    }

    @PostMapping("/{workspaceId}/members/{userId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> addMember(@PathVariable Long workspaceId, @PathVariable Long userId) {
        workspaceService.addMemberToWorkspace(workspaceId, userId);
        return ResponseEntity.ok().build();
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'PROJECT_MANAGER', 'TEAM_MEMBER')")
    public ResponseEntity<List<WorkspaceDTO>> getUserWorkspaces() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        return ResponseEntity.ok(workspaceService.getUserWorkspaces(username));
    }

    @GetMapping("/{workspaceId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'PROJECT_MANAGER', 'TEAM_MEMBER')")
    public ResponseEntity<WorkspaceDTO> getWorkspace(@PathVariable Long workspaceId) {
        return ResponseEntity.ok(workspaceService.getWorkspaceById(workspaceId));
    }


    @PutMapping("/{workspaceId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<WorkspaceDTO> updateWorkspace(@PathVariable Long workspaceId, @RequestBody Map<String, String> req) {
        return ResponseEntity.ok(workspaceService.updateWorkspace(workspaceId, req.get("name"), req.get("description")));
    }

    @DeleteMapping("/{workspaceId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> deleteWorkspace(@PathVariable Long workspaceId) {
        workspaceService.deleteWorkspace(workspaceId);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/{workspaceId}/members/{userId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> removeMember(@PathVariable Long workspaceId, @PathVariable Long userId) {
        workspaceService.removeMemberFromWorkspace(workspaceId, userId);
        return ResponseEntity.ok().build();
    }
}
