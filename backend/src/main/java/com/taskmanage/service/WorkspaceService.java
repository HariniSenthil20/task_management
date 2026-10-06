package com.taskmanage.service;

import com.taskmanage.dto.WorkspaceDTO;
import com.taskmanage.dto.UserDTO;
import com.taskmanage.model.User;
import com.taskmanage.model.Workspace;
import com.taskmanage.model.WorkspaceMember;
import com.taskmanage.repository.UserRepository;
import com.taskmanage.repository.WorkspaceMemberRepository;
import com.taskmanage.repository.WorkspaceRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class WorkspaceService {
    @Autowired
    private WorkspaceRepository workspaceRepository;
    @Autowired
    private WorkspaceMemberRepository workspaceMemberRepository;
    @Autowired
    private UserRepository userRepository;

    @Transactional
    public WorkspaceDTO createWorkspace(String name, String description, String ownerUsername) {
        User owner = userRepository.findByUsername(ownerUsername)
            .orElseThrow(() -> new RuntimeException("User not found"));

        Workspace ws = new Workspace();
        ws.setName(name);
        ws.setDescription(description);
        ws.setOwner(owner);
        Workspace saved = workspaceRepository.save(ws);

        WorkspaceMember member = new WorkspaceMember();
        member.setWorkspace(saved);
        member.setUser(owner);
        workspaceMemberRepository.save(member);

        return mapToDTO(saved);
    }

    @Transactional
    public void addMemberToWorkspace(Long workspaceId, Long userId) {
        Workspace ws = workspaceRepository.findById(workspaceId)
            .orElseThrow(() -> new RuntimeException("Workspace not found"));
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found"));
            
        // Check if already member
        boolean exists = workspaceMemberRepository.findByUserId(userId).stream()
            .anyMatch(wm -> wm.getWorkspace().getId().equals(workspaceId));
            
        if (!exists) {
            WorkspaceMember member = new WorkspaceMember();
            member.setWorkspace(ws);
            member.setUser(user);
            workspaceMemberRepository.save(member);
        }
    }

    @Transactional
    public List<WorkspaceDTO> getUserWorkspaces(String username) {
        User user = userRepository.findByUsername(username)
            .orElseThrow(() -> new RuntimeException("User not found"));
            
        return workspaceMemberRepository.findByUserId(user.getId())
            .stream()
            .map(wm -> mapToDTO(wm.getWorkspace()))
            .collect(Collectors.toList());
    }

    @Transactional
    public WorkspaceDTO updateWorkspace(Long workspaceId, String name, String description) {
        Workspace ws = workspaceRepository.findById(workspaceId).orElseThrow();
        if (name != null) ws.setName(name);
        if (description != null) ws.setDescription(description);
        return mapToDTO(workspaceRepository.save(ws));
    }

    @Transactional
    public void deleteWorkspace(Long workspaceId) {
        workspaceRepository.deleteById(workspaceId);
    }

    @Transactional
    public void removeMemberFromWorkspace(Long workspaceId, Long userId) {
        workspaceMemberRepository.findByUserId(userId).stream()
            .filter(wm -> wm.getWorkspace().getId().equals(workspaceId))
            .findFirst()
            .ifPresent(wm -> workspaceMemberRepository.delete(wm));
    }

    @Transactional
    public WorkspaceDTO getWorkspaceById(Long workspaceId) {
        Workspace w = workspaceRepository.findById(workspaceId).orElseThrow();
        return mapToDTO(w);
    }

    private WorkspaceDTO mapToDTO(Workspace w) {
        WorkspaceDTO dto = new WorkspaceDTO();
        dto.setId(w.getId());
        dto.setName(w.getName());
        dto.setDescription(w.getDescription());
        dto.setCreatedAt(w.getCreatedAt());
        
        UserDTO owner = new UserDTO();
        owner.setId(w.getOwner().getId());
        owner.setUsername(w.getOwner().getUsername());
        owner.setEmail(w.getOwner().getEmail());
        owner.setRole(w.getOwner().getRole().getName().name());
        dto.setOwner(owner);
        
        List<UserDTO> members = workspaceMemberRepository.findByWorkspaceId(w.getId())
            .stream()
            .map(wm -> {
                UserDTO m = new UserDTO();
                m.setId(wm.getUser().getId());
                m.setUsername(wm.getUser().getUsername());
                m.setEmail(wm.getUser().getEmail());
                m.setRole(wm.getUser().getRole().getName().name());
                return m;
            })
            .collect(Collectors.toList());
        dto.setMembers(members);
        
        return dto;
    }
}
