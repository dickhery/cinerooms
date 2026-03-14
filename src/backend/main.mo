import Array "mo:core/Array";
import Int "mo:core/Int";
import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Order "mo:core/Order";
import Principal "mo:core/Principal";
import Runtime "mo:core/Runtime";
import Text "mo:core/Text";
import Time "mo:core/Time";
import MixinAuthorization "authorization/MixinAuthorization";
import MixinStorage "blob-storage/Mixin";
import AccessControl "authorization/access-control";

actor {
  include MixinStorage();
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  public type UserProfile = { name : Text };
  let userProfiles = Map.empty<Principal, UserProfile>();

  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) { Runtime.trap("Unauthorized") };
    userProfiles.get(caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) { Runtime.trap("Unauthorized") };
    userProfiles.get(user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) { Runtime.trap("Unauthorized") };
    userProfiles.add(caller, profile);
  };

  type Room = {
    id : Nat;
    title : Text;
    slug : Text;
    description : Text;
    price : Text;
    thumbnailUrl : Text;
    videoUrl : Text;
    embedScript : Text;
    createdAt : Time.Time;
    viewDuration : Text;
    category : Text;
    creatorName : Text;
  };

  module Room {
    public func compare(room1 : Room, room2 : Room) : Order.Order {
      Int.compare(room2.createdAt, room1.createdAt);
    };
  };

  // Stable storage for rooms — survives canister upgrades
  stable var _stableRooms : [Room] = [];
  stable var nextRoomId : Nat = 1;

  let rooms = Map.empty<Nat, Room>();

  // IMPORTANT: VideoSubmission type is kept UNCHANGED from the original deployment.
  // Changing this type would break stable memory compatibility with the existing Map.
  // All public API functions return VideoSubmissionFull which adds denialReason.
  type VideoSubmission = {
    id : Nat;
    submitterPrincipal : Principal;
    title : Text;
    description : Text;
    videoUrl : Text;
    thumbnailUrl : Text;
    paymentAddress : Text;
    price : Text;
    category : Text;
    viewDuration : Text;
    creatorName : Text;
    status : Text;
    createdAt : Time.Time;
  };

  // Public response type — extends VideoSubmission with denialReason.
  // All public query/update functions return this type.
  type VideoSubmissionFull = {
    id : Nat;
    submitterPrincipal : Principal;
    title : Text;
    description : Text;
    videoUrl : Text;
    thumbnailUrl : Text;
    paymentAddress : Text;
    price : Text;
    category : Text;
    viewDuration : Text;
    creatorName : Text;
    status : Text;
    createdAt : Time.Time;
    denialReason : Text;
  };

  // Stable storage for submissions — type MUST NOT change (Map compatibility)
  stable var _stableSubmissions : [VideoSubmission] = [];
  stable var nextSubmissionId : Nat = 1;

  let pendingSubmissions = Map.empty<Nat, VideoSubmission>();

  // Denial reasons stored separately to avoid changing VideoSubmission type.
  // Stable var — persists automatically across upgrades without pre/postupgrade handling.
  stable var _denialReasons : [(Nat, Text)] = [];

  func getDenialReason(id : Nat) : Text {
    let found = _denialReasons.vals().find(func((k, _v) : (Nat, Text)) : Bool { k == id });
    switch (found) {
      case (?(_, reason)) reason;
      case null "";
    };
  };

  func setDenialReason(id : Nat, reason : Text) : () {
    let filtered = _denialReasons.vals()
      .filter(func((k, _v) : (Nat, Text)) : Bool { k != id })
      .toArray();
    let size = filtered.size();
    _denialReasons := Array.tabulate<(Nat, Text)>(size + 1, func(i : Nat) : (Nat, Text) {
      if (i < size) filtered[i] else (id, reason)
    });
  };

  func toFull(sub : VideoSubmission) : VideoSubmissionFull {
    {
      id = sub.id;
      submitterPrincipal = sub.submitterPrincipal;
      title = sub.title;
      description = sub.description;
      videoUrl = sub.videoUrl;
      thumbnailUrl = sub.thumbnailUrl;
      paymentAddress = sub.paymentAddress;
      price = sub.price;
      category = sub.category;
      viewDuration = sub.viewDuration;
      creatorName = sub.creatorName;
      status = sub.status;
      createdAt = sub.createdAt;
      denialReason = getDenialReason(sub.id);
    };
  };

  // ── Homepage Scripts ──────────────────────────────────────────────────────
  type HomepageScript = {
    id : Nat;
    name : Text;
    scriptContent : Text;
    order : Nat;
  };

  // Stable storage for homepage scripts — survives canister upgrades
  stable var _stableScripts : [HomepageScript] = [];
  stable var nextScriptId : Nat = 1;

  let homepageScripts = Map.empty<Nat, HomepageScript>();

  // ── Admin bootstrap stable state ─────────────────────────────────────────
  // Hardcoded admin PIDs — these are privileged forever.
  let hardcodedAdminTexts : [Text] = [
    "xcrfe-n64wj-5ec52-kpr3q-h5yft-ovyo6-4bjso-ubj2v-qe3uo-tm3ie-aqe",
    "dmqpn-7duh5-66nau-irxp2-tqm3o-ahcdq-36tps-krdf3-wwjiu-33hdf-mae",
  ];

  // Dynamic admins: first non-hardcoded user to triple-tap after a fresh reset
  // is stored here persistently. Survives all future upgrades.
  stable var dynamicAdmins : [Principal] = [];
  stable var firstAdminClaimed : Bool = false;

  // Helper: seed a principal as admin in accessControlState
  func seedAdmin(p : Principal) {
    accessControlState.userRoles.add(p, #admin);
    accessControlState.adminAssigned := true;
  };

  // ── Upgrade hooks ─────────────────────────────────────────────────────────
  system func preupgrade() {
    _stableRooms := rooms.values().toArray();
    _stableSubmissions := pendingSubmissions.values().toArray();
    _stableScripts := homepageScripts.values().toArray();
    // _denialReasons is a stable var — persists automatically, no action needed here
  };

  system func postupgrade() {
    // Restore rooms
    for (room in _stableRooms.vals()) {
      rooms.add(room.id, room);
    };
    // Restore submissions
    for (sub in _stableSubmissions.vals()) {
      pendingSubmissions.add(sub.id, sub);
    };
    // Restore homepage scripts
    for (script in _stableScripts.vals()) {
      homepageScripts.add(script.id, script);
    };
    _stableRooms := [];
    _stableSubmissions := [];
    _stableScripts := [];

    // ── Re-seed admin roles into accessControlState on every upgrade ──────
    // accessControlState is NOT stable so it resets on upgrade.
    // We re-populate it from our stable sources so admins keep access
    // immediately after any redeploy without needing to re-authenticate.
    for (t in hardcodedAdminTexts.vals()) {
      let p = Principal.fromText(t);
      seedAdmin(p);
    };
    for (p in dynamicAdmins.vals()) {
      seedAdmin(p);
    };
    // Mark firstAdminClaimed if hardcoded admins exist (so no stranger
    // can claim the first-admin slot just because dynamicAdmins is empty).
    if (hardcodedAdminTexts.size() > 0) {
      firstAdminClaimed := true;
    };
  };

  // ─────────────────────────────────────────────────────────────────────────

  // Public read — no auth required so HomePage can fetch without login
  public query func getHomepageScripts() : async [HomepageScript] {
    let arr = homepageScripts.values().toArray();
    arr.sort(func(a : HomepageScript, b : HomepageScript) : Order.Order {
      Nat.compare(a.order, b.order);
    });
  };

  public shared ({ caller }) func addHomepageScript(name : Text, scriptContent : Text) : async HomepageScript {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admin can manage homepage scripts");
    };
    let id = nextScriptId;
    nextScriptId += 1;
    var maxOrder : Nat = 0;
    for (s in homepageScripts.values()) {
      if (s.order > maxOrder) { maxOrder := s.order };
    };
    let script : HomepageScript = { id; name; scriptContent; order = maxOrder + 1 };
    homepageScripts.add(id, script);
    script;
  };

  public shared ({ caller }) func updateHomepageScript(id : Nat, name : Text, scriptContent : Text) : async HomepageScript {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admin can manage homepage scripts");
    };
    switch (homepageScripts.get(id)) {
      case null { Runtime.trap("Script not found") };
      case (?existing) {
        let updated : HomepageScript = { existing with name; scriptContent };
        homepageScripts.add(id, updated);
        updated;
      };
    };
  };

  public shared ({ caller }) func removeHomepageScript(id : Nat) : async Bool {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admin can manage homepage scripts");
    };
    let existed = homepageScripts.containsKey(id);
    homepageScripts.remove(id);
    existed;
  };

  public shared ({ caller }) func reorderHomepageScripts(ids : [Nat]) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admin can manage homepage scripts");
    };
    var idx = 1;
    for (id in ids.vals()) {
      switch (homepageScripts.get(id)) {
        case null {};
        case (?s) {
          homepageScripts.add(id, { s with order = idx });
          idx += 1;
        };
      };
    };
  };

  // ── Admin bootstrap ───────────────────────────────────────────────────────
  //
  // Called by the frontend after every authenticated actor creation.
  // Handles three cases atomically:
  //   1. Hardcoded admin — always granted, ensures accessControlState is in sync.
  //   2. First-admin claim — first non-anonymous, non-hardcoded caller on a
  //      fresh/reset canister (dynamicAdmins empty, firstAdminClaimed false)
  //      is permanently promoted.
  //   3. Returning user — checks both lists, returns whether caller is admin.
  //
  // Deployment note: after a hard canister reset use:
  //   dfx canister stop backend && dfx deploy backend && dfx canister start backend
  public shared ({ caller }) func bootstrapAdminIfNeeded() : async Bool {
    if (caller.isAnonymous()) { return false };

    let callerText = caller.toText();

    // Case 1: Hardcoded admin — always synced into accessControlState.
    let isHardcoded = hardcodedAdminTexts.vals().find(func(t : Text) : Bool { t == callerText }) != null;
    if (isHardcoded) {
      seedAdmin(caller);
      return true;
    };

    // Case 2: First-admin claim (only once, when no dynamic admin exists yet).
    if (not firstAdminClaimed and dynamicAdmins.size() == 0) {
      let prev = dynamicAdmins; dynamicAdmins := Array.tabulate<Principal>(prev.size() + 1, func(i) { if (i < prev.size()) prev[i] else caller });
      firstAdminClaimed := true;
      seedAdmin(caller);
      return true;
    };

    // Case 3: Check whether caller is already a dynamic admin.
    let isDynamic = dynamicAdmins.vals().find(func(p : Principal) : Bool { p == caller }) != null;
    if (isDynamic) {
      // Re-sync into accessControlState in case of upgrade reset.
      seedAdmin(caller);
      return true;
    };

    false;
  };

  // ── hasAdmin — checks both hardcoded list and dynamicAdmins ──────────────
  public query func hasAdmin() : async Bool {
    dynamicAdmins.size() > 0 or hardcodedAdminTexts.size() > 0;
  };

  // ── isAdmin (convenience query for the caller) ────────────────────────────
  public query ({ caller }) func isAdmin() : async Bool {
    AccessControl.isAdmin(accessControlState, caller);
  };

  // ─────────────────────────────────────────────────────────────────────────

  public shared ({ caller }) func createRoom(
    title : Text,
    slug : Text,
    description : Text,
    price : Text,
    thumbnailUrl : Text,
    videoUrl : Text,
    embedScript : Text,
    viewDuration : Text,
    category : Text,
    creatorName : Text,
  ) : async Room {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admin can create rooms");
    };

    let roomId = nextRoomId;
    nextRoomId += 1;

    let newRoom : Room = {
      id = roomId;
      title;
      slug;
      description;
      price;
      thumbnailUrl;
      videoUrl;
      embedScript;
      createdAt = Time.now();
      viewDuration;
      category;
      creatorName;
    };
    rooms.add(roomId, newRoom);
    newRoom;
  };

  public shared ({ caller }) func updateRoom(
    id : Nat,
    title : Text,
    slug : Text,
    description : Text,
    price : Text,
    thumbnailUrl : Text,
    videoUrl : Text,
    embedScript : Text,
    viewDuration : Text,
    category : Text,
    creatorName : Text,
  ) : async Room {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admin can update rooms");
    };
    switch (rooms.get(id)) {
      case (null) { Runtime.trap("Room not found") };
      case (?existingRoom) {
        let updatedRoom : Room = {
          id;
          title;
          slug;
          description;
          price;
          thumbnailUrl;
          videoUrl;
          embedScript;
          createdAt = existingRoom.createdAt;
          viewDuration;
          category;
          creatorName;
        };
        rooms.add(id, updatedRoom);
        updatedRoom;
      };
    };
  };

  public shared ({ caller }) func deleteRoom(id : Nat) : async Bool {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) { Runtime.trap("Unauthorized") };
    let existed = rooms.containsKey(id);
    rooms.remove(id);
    existed;
  };

  public query func getRooms() : async [Room] {
    rooms.values().toArray().sort();
  };

  public query func getRoomById(id : Nat) : async ?Room {
    rooms.get(id);
  };

  public query func getRoomBySlug(slug : Text) : async ?Room {
    rooms.values().find(func(room) { room.slug == slug });
  };

  public shared ({ caller }) func submitVideo(
    title : Text,
    description : Text,
    videoUrl : Text,
    thumbnailUrl : Text,
    paymentAddress : Text,
    price : Text,
    category : Text,
    viewDuration : Text,
    creatorName : Text,
  ) : async VideoSubmissionFull {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can submit videos");
    };
    let submissionId = nextSubmissionId;
    nextSubmissionId += 1;

    let newSubmission : VideoSubmission = {
      id = submissionId;
      submitterPrincipal = caller;
      title;
      description;
      videoUrl;
      thumbnailUrl;
      price;
      paymentAddress;
      category;
      viewDuration;
      creatorName;
      status = "Pending";
      createdAt = Time.now();
    };
    pendingSubmissions.add(submissionId, newSubmission);
    toFull(newSubmission);
  };

  public query ({ caller }) func getUserSubmissions() : async [VideoSubmissionFull] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) { Runtime.trap("Unauthorized") };
    pendingSubmissions.values()
      .filter(func(s) { s.submitterPrincipal == caller })
      .map(toFull)
      .toArray();
  };

  public query ({ caller }) func getPendingSubmissions() : async [VideoSubmissionFull] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admin can view pending submissions");
    };
    pendingSubmissions.values().map(toFull).toArray();
  };

  public shared ({ caller }) func reviewSubmission(
    id : Nat,
    approve : Bool,
    embedScript : Text,
    denialReason : Text,
  ) : async VideoSubmissionFull {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admin can review submissions");
    };
    switch (pendingSubmissions.get(id)) {
      case (null) { Runtime.trap("Submission not found") };
      case (?submission) {
        if (approve) {
          let roomId = nextRoomId;
          nextRoomId += 1;
          let newRoom : Room = {
            id = roomId;
            title = submission.title;
            slug = toSlug(submission.title);
            description = submission.description;
            price = submission.price;
            thumbnailUrl = submission.thumbnailUrl;
            videoUrl = submission.videoUrl;
            embedScript;
            createdAt = Time.now();
            viewDuration = submission.viewDuration;
            category = submission.category;
            creatorName = submission.creatorName;
          };
          rooms.add(roomId, newRoom);
          let updated : VideoSubmission = { submission with status = "Approved" };
          pendingSubmissions.add(id, updated);
          toFull(updated);
        } else {
          let updated : VideoSubmission = { submission with status = "Denied" };
          pendingSubmissions.add(id, updated);
          setDenialReason(id, denialReason);
          toFull(updated);
        };
      };
    };
  };

  func toSlug(title : Text) : Text {
    let lower = title.toLower();
    let withDashes = lower.map(func(c) { if (c == ' ') { '-' } else { c } });
    let filteredChars = withDashes.toArray().filter(func(c) { not (c == '!' or c == '?') });
    Text.fromArray(filteredChars);
  };

  public shared ({ caller }) func resetAdmin() : async () {
    if (not (AccessControl.isAdmin(accessControlState, caller))) {
      Runtime.trap("Unauthorized: only the current admin can reset admin access");
    };
    accessControlState.userRoles.add(caller, #user);
    accessControlState.adminAssigned := false;
  };

  // Keep claimHardcodedAdmin for backward-compat; delegates to bootstrapAdminIfNeeded logic.
  public shared ({ caller }) func claimHardcodedAdmin() : async Bool {
    let callerText = caller.toText();
    let isOwner = hardcodedAdminTexts.vals().find(func(pid : Text) : Bool { pid == callerText }) != null;
    if (isOwner) {
      seedAdmin(caller);
      true;
    } else {
      false;
    };
  };
};
